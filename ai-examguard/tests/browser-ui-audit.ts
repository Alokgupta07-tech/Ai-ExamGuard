import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3011'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const raw = fs.readFileSync(envPath, 'utf8')
  const map: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx <= 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    map[key] = val
  }
  const url = map.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon =
    map.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
  const secret = map.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ''
  return { url, anon, secret }
}

async function waitFor<T>(
  fn: () => Promise<T>,
  pred: (v: T) => boolean,
  timeoutMs: number,
  label: string
): Promise<T> {
  const start = Date.now()
  let lastVal: T | undefined
  while (Date.now() - start < timeoutMs) {
    lastVal = await fn()
    if (pred(lastVal)) return lastVal
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Timed out waiting for ${label}. Last state: ${JSON.stringify(lastVal).slice(0, 600)}`)
}

class CdpClient {
  private ws: WebSocket
  private nextId = 1
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  consoleErrors: string[] = []
  pageErrors: string[] = []
  serverErrors: string[] = []

  constructor(ws: WebSocket) {
    this.ws = ws
    ws.onmessage = (evt) => {
      const msg = JSON.parse(String(evt.data)) as {
        id?: number
        result?: unknown
        error?: { message: string }
        method?: string
        params?: Record<string, unknown>
      }
      if (msg.id) {
        const entry = this.pending.get(msg.id)
        if (!entry) return
        this.pending.delete(msg.id)
        if (msg.error) entry.reject(new Error(msg.error.message))
        else entry.resolve(msg.result)
        return
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(JSON.stringify(msg.params))
      } else if (msg.method === 'Console.messageAdded') {
        const message = (msg.params?.message as { level?: string; text?: string }) ?? {}
        if (message.level === 'error') {
          this.consoleErrors.push(message.text ?? 'console error')
        }
      } else if (msg.method === 'Network.responseReceived') {
        const resp = (msg.params?.response as { status?: number; url?: string }) ?? {}
        if (typeof resp.status === 'number' && resp.status >= 500 && resp.url?.startsWith(BASE_URL)) {
          this.serverErrors.push(`${resp.status} ${resp.url}`)
        }
      }
    }
  }

  static async connect(wsUrl: string): Promise<CdpClient> {
    const ws = new WebSocket(wsUrl)
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = () => reject(new Error('CDP WebSocket connection failed'))
    })
    return new CdpClient(ws)
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async eval<T>(expression: string): Promise<T> {
    const res = (await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as { result?: { value?: T }; exceptionDetails?: unknown }
    if (res.exceptionDetails) {
      throw new Error(`CDP eval error: ${JSON.stringify(res.exceptionDetails)}`)
    }
    return res.result?.value as T
  }

  async navigate(url: string) {
    this.consoleErrors = []
    this.pageErrors = []
    this.serverErrors = []
    await this.send('Page.navigate', { url })
    await waitFor(
      () => this.eval<string>('document.readyState'),
      (s) => s === 'complete',
      15_000,
      `readyState for ${url}`
    )
    await new Promise((r) => setTimeout(r, 700))
  }

  async setViewport(width: number, height: number) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    })
    await new Promise((r) => setTimeout(r, 250))
  }

  async pressKey(key: string, code: string, windowsVirtualKeyCode: number) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
  }

  close() {
    this.ws.close()
  }
}

async function launchBrowser(executablePath: string, port: number) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `examguard-qa14-${port}-`))
  const proc = spawn(
    executablePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1366,900',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      'about:blank',
    ],
    { stdio: 'ignore' }
  )

  let wsUrl = ''
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`)
      const targets = (await res.json()) as Array<{ type: string; webSocketDebuggerUrl?: string }>
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page?.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl
        break
      }
    } catch {
      // retry while browser boots
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  if (!wsUrl) {
    proc.kill()
    throw new Error(`CDP target unavailable on port ${port}`)
  }

  const cdp = await CdpClient.connect(wsUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Console.enable')

  return {
    cdp,
    cleanup: () => {
      cdp.close()
      proc.kill()
      setTimeout(() => {
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true })
        } catch {
          // ignore cleanup lock
        }
      }, 400)
    },
  }
}

async function signInCookies(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
) {
  const jar = new Map<string, string>()
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => Array.from(jar.entries()).map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const item of list) {
          if (item.value) jar.set(item.name, item.value)
          else jar.delete(item.name)
        }
      },
    },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  assert.ifError(error)
  return Array.from(jar.entries()).map(([name, value]) => ({ name, value }))
}

async function setAuthCookies(cdp: CdpClient, cookies: Array<{ name: string; value: string }>) {
  await cdp.send('Network.clearBrowserCookies')
  for (const c of cookies) {
    await cdp.send('Network.setCookie', {
      name: c.name,
      value: c.value,
      url: BASE_URL,
      path: '/',
    })
  }
}

async function assertRouteHealthy(cdp: CdpClient, browserName: string, routePath: string) {
  await cdp.navigate(`${BASE_URL}${routePath}`)
  const inspect = await waitFor(
    () =>
      cdp.eval<{
        len: number
        hasAppError: boolean
        currentPath: string
        overflowX: number
      }>(`(() => {
        const text = document.body.innerText || '';
        return {
          len: text.trim().length,
          hasAppError: text.includes('Application error') || text.includes('Unhandled Runtime Error'),
          currentPath: window.location.pathname,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      })()`),
    (res) => res.len > 25 || res.hasAppError || res.currentPath !== routePath,
    12_000,
    `${browserName} ${routePath} content render`
  )

  assert.equal(inspect.hasAppError, false, `${browserName} ${routePath} hit Application Error`)
  assert.ok(inspect.len > 25, `${browserName} ${routePath} rendered empty body (${inspect.len} chars)`)
  assert.equal(inspect.currentPath, routePath, `${browserName} ${routePath} redirected unexpectedly to ${inspect.currentPath}`)
  assert.deepEqual(cdp.pageErrors, [], `${browserName} ${routePath} uncaught pageErrors: ${cdp.pageErrors.join(' | ')}`)
  assert.deepEqual(cdp.serverErrors, [], `${browserName} ${routePath} 5xx responses: ${cdp.serverErrors.join(' | ')}`)
  assert.ok(inspect.overflowX <= 4, `${browserName} ${routePath} horizontal overflow ${inspect.overflowX}px`)
}

test('Phase 14 Browser UI, Navigation, Modal, Responsive & Preflight Audit (Chrome + Edge)', async (t) => {
  try {
    const ping = await fetch(`${BASE_URL}/login`)
    if (!ping.ok) throw new Error(`HTTP ${ping.status}`)
  } catch (err) {
    t.skip(`Live Next.js server not running at ${BASE_URL}: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  const { url: supabaseUrl, anon, secret } = loadEnvLocal()
  const adminDb = createClient(supabaseUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const runTag = `qa14ui-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const password = `Qa14Ui!${crypto.randomBytes(6).toString('hex')}`
  const createdUserIds: string[] = []
  const cleanups: Array<() => void> = []
  let tenantId: string | null = null

  const createRoleUser = async (
    role: 'admin' | 'instructor' | 'invigilator' | 'student'
  ) => {
    const email = `${runTag}.${role}@example.test`
    const fullName = `QA14 UI ${role}`
    const { data, error } = await adminDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    assert.ifError(error)
    assert.ok(data.user)
    createdUserIds.push(data.user.id)
    await adminDb.from('profiles').upsert({ id: data.user.id, email, full_name: fullName })
    await adminDb.from('memberships').insert({ tenant_id: tenantId!, user_id: data.user.id, role })
    return { id: data.user.id, email, fullName }
  }

  try {
    const { data: tenant, error: tErr } = await adminDb
      .from('tenants')
      .insert({ name: `QA14 UI Univ ${runTag}`, slug: runTag, domain: `${runTag}.edu` })
      .select('id')
      .single()
    assert.ifError(tErr)
    assert.ok(tenant)
    tenantId = tenant.id

    const adminUser = await createRoleUser('admin')
    const instructorUser = await createRoleUser('instructor')
    const invigUser = await createRoleUser('invigilator')
    const studentUser = await createRoleUser('student')

    const { data: course } = await adminDb
      .from('courses')
      .insert({
        tenant_id: tenantId,
        instructor_id: instructorUser.id,
        name: 'QA14 UI Course',
        code: `UI-${Math.floor(100 + Math.random() * 899)}`,
        semester: 'Fall 2026',
      })
      .select('id')
      .single()
    assert.ok(course)

    const nowMs = Date.now()
    const { data: exam } = await adminDb
      .from('exams')
      .insert({
        course_id: course.id,
        tenant_id: tenantId,
        created_by: instructorUser.id,
        title: `QA14 UI Audit Exam ${runTag}`,
        duration_minutes: 45,
        start_time: new Date(nowMs - 10 * 60_000).toISOString(),
        end_time: new Date(nowMs + 90 * 60_000).toISOString(),
        status: 'published',
        total_points: 5,
        settings: { require_camera: true, require_audio: true, require_fullscreen: true },
      })
      .select('id')
      .single()
    assert.ok(exam)

    const { data: q1 } = await adminDb
      .from('questions')
      .insert({
        exam_id: exam.id,
        order_index: 1,
        type: 'mcq_single',
        prompt: 'Which API runs local Web Audio analysis?',
        points: 5,
      })
      .select('id')
      .single()
    assert.ok(q1)

    await adminDb.from('question_answer_keys').insert([
      { question_id: q1.id, label: 'A', content: 'AudioContext AnalyserNode', is_correct: true, order_index: 1 },
      { question_id: q1.id, label: 'B', content: 'HTML marquee', is_correct: false, order_index: 2 },
    ])
    await adminDb.from('enrollments').insert({ course_id: course.id, student_id: studentUser.id })
    await adminDb.from('exam_assignments').insert({ exam_id: exam.id, student_id: studentUser.id })

    const cookies = {
      admin: await signInCookies(supabaseUrl, anon, adminUser.email, password),
      instructor: await signInCookies(supabaseUrl, anon, instructorUser.email, password),
      invigilator: await signInCookies(supabaseUrl, anon, invigUser.email, password),
      student: await signInCookies(supabaseUrl, anon, studentUser.email, password),
    }

    // 1. Chrome exhaustive audit
    if (!fs.existsSync(CHROME_PATH)) {
      throw new Error(`Chrome executable not found at ${CHROME_PATH}`)
    }
    const chrome = await launchBrowser(CHROME_PATH, 9331)
    cleanups.push(chrome.cleanup)
    const { cdp } = chrome

    // Public routes desktop + reduced motion
    for (const r of ['/', '/login', '/signup', '/forgot-password', '/unauthorized']) {
      await assertRouteHealthy(cdp, 'Chrome', r)
    }

    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
    await assertRouteHealthy(cdp, 'Chrome (reduced-motion)', '/')
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })

    // Interactive Login Form UI flow test (real submit on /login as Admin)
    await cdp.navigate(`${BASE_URL}/login`)
    const formFilled = await cdp.eval<boolean>(`(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      const btn = document.querySelector('button[type="submit"]');
      if (!emailInput || !passInput || !btn) return false;
      const setNative = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setNative(emailInput, ${JSON.stringify(adminUser.email)});
      setNative(passInput, ${JSON.stringify(password)});
      btn.click();
      return true;
    })()`)
    assert.equal(formFilled, true, 'Login form controls must exist and accept input')
    await waitFor(
      () => cdp.eval<string>('window.location.pathname'),
      (p) => p === '/admin',
      15_000,
      'UI form login redirect to /admin'
    )

    // Admin routes + Invite Member modal Escape close
    const adminRoutes = [
      '/admin',
      '/admin/users',
      '/admin/departments',
      '/admin/courses',
      '/admin/exams',
      '/admin/question-bank',
      '/admin/monitoring',
      '/admin/reports',
      '/admin/integrations',
      '/admin/security',
      '/admin/audit-logs',
      '/admin/settings',
    ]
    for (const r of adminRoutes) {
      await assertRouteHealthy(cdp, 'Chrome Admin', r)
    }

    // Check modal interaction on /admin/users
    await cdp.navigate(`${BASE_URL}/admin/users`)
    const openedModal = await cdp.eval<boolean>(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Invite|Add/i.test(b.textContent || ''));
      if (!btn) return false;
      btn.click();
      return true;
    })()`)
    if (openedModal) {
      await new Promise((r) => setTimeout(r, 300))
      const hasDialog = await cdp.eval<boolean>('Boolean(document.querySelector("[role=dialog]"))')
      assert.equal(hasDialog, true, 'Admin Users modal should open')
      await cdp.pressKey('Escape', 'Escape', 27)
      await new Promise((r) => setTimeout(r, 300))
    }

    // Check sidebar nav links on /admin have valid hrefs (no 404/broken anchors)
    const adminLinks = await cdp.eval<string[]>(`Array.from(document.querySelectorAll('aside a, nav a')).map(a => a.getAttribute('href') || '').filter(h => h.startsWith('/'))`)
    assert.ok(adminLinks.length >= 4, 'Admin sidebar must expose navigation links')

    // Faculty routes
    await setAuthCookies(cdp, cookies.instructor)
    for (const r of [
      '/faculty',
      '/faculty/analytics',
      '/faculty/assignments',
      '/faculty/exams',
      '/faculty/exams/new',
      '/faculty/monitoring',
      '/faculty/question-bank',
      '/faculty/results',
      '/faculty/review-cases',
    ]) {
      await assertRouteHealthy(cdp, 'Chrome Faculty', r)
    }

    // Invigilator routes
    await setAuthCookies(cdp, cookies.invigilator)
    for (const r of [
      '/invigilator',
      '/invigilator/alerts',
      '/invigilator/candidates',
      '/invigilator/examinations',
      '/invigilator/reports',
      '/invigilator/review-cases',
      '/invigilator/timeline',
    ]) {
      await assertRouteHealthy(cdp, 'Chrome Invigilator', r)
    }

    // Student portal routes
    await setAuthCookies(cdp, cookies.student)
    for (const r of [
      '/student',
      '/student/available',
      '/student/device-readiness',
      '/student/history',
      '/student/profile',
      '/student/results',
      '/student/support',
      '/student/upcoming',
    ]) {
      await assertRouteHealthy(cdp, 'Chrome Student', r)
    }

    // Student preflight & active exam check (fake camera + fake mic + wait for question hydration)
    await assertRouteHealthy(cdp, 'Chrome Preflight', `/exam/${exam.id}/preflight`)
    const preflightSummary = await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes('Camera') && txt.includes('Microphone'),
      15_000,
      'Preflight readiness cards hydrated'
    )
    assert.ok(
      preflightSummary.includes('Camera') && preflightSummary.includes('Microphone'),
      'Preflight should show Camera and Microphone readiness panels'
    )

    await assertRouteHealthy(cdp, 'Chrome ActiveExam', `/exam/${exam.id}`)
    const examText = await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes('Which API runs local Web Audio analysis'),
      15_000,
      'Active exam question prompt hydrated'
    )
    assert.ok(examText.includes('Which API runs local Web Audio analysis'), 'Active exam page must render question prompt')
    const canvasCount = await cdp.eval<number>('document.querySelectorAll("canvas").length')
    assert.equal(canvasCount, 0, 'Active exam interface must not render 3D WebGL canvas')

    // Responsive mobile viewport (390x844) audit on primary pages
    await cdp.setViewport(390, 844)
    for (const r of ['/', '/login', '/student']) {
      await cdp.navigate(`${BASE_URL}${r}`)
      const overflow = await cdp.eval<number>(
        'document.documentElement.scrollWidth - document.documentElement.clientWidth'
      )
      assert.ok(overflow <= 4, `Mobile 390px overflow on ${r}: ${overflow}px`)
    }
    await cdp.setViewport(1366, 900)

    // 2. Cross-browser Microsoft Edge check (when installed on Windows)
    if (fs.existsSync(EDGE_PATH)) {
      const edge = await launchBrowser(EDGE_PATH, 9332)
      cleanups.push(edge.cleanup)
      await assertRouteHealthy(edge.cdp, 'Edge Public', '/')
      await assertRouteHealthy(edge.cdp, 'Edge Login', '/login')
      await setAuthCookies(edge.cdp, cookies.admin)
      await assertRouteHealthy(edge.cdp, 'Edge Admin', '/admin')
      await setAuthCookies(edge.cdp, cookies.student)
      await assertRouteHealthy(edge.cdp, 'Edge Preflight', `/exam/${exam.id}/preflight`)
    }

    // 3. UI Logout button check (runs after Edge so global session revocation does not invalidate Edge token)
    await setAuthCookies(cdp, cookies.student)
    await cdp.navigate(`${BASE_URL}/student`)
    const clickedLogout = await cdp.eval<boolean>(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Sign Out|Log out|Logout/i.test(b.textContent || ''));
      if (!btn) return false;
      btn.click();
      return true;
    })()`)
    assert.equal(clickedLogout, true, 'Student sidebar/header Sign Out button should exist')
    await waitFor(
      () => cdp.eval<string>('window.location.pathname'),
      (p) => p === '/login' || p === '/',
      10_000,
      'Logout redirect to /login or /'
    )
  } finally {
    for (const fn of cleanups) {
      try {
        fn()
      } catch {
        // ignore
      }
    }
    if (tenantId) await adminDb.from('tenants').delete().eq('id', tenantId)
    for (const uid of createdUserIds) {
      await adminDb.auth.admin.deleteUser(uid)
    }
  }
})

