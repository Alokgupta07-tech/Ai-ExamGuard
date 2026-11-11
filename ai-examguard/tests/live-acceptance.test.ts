import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const LIVE_URL = (process.env.LIVE_URL ?? 'https://ai-examguard-three.vercel.app').replace(/\/$/, '')
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

interface EnvConfig {
  url: string
  anon: string
  secret: string
}

function loadEnvConfig(): EnvConfig {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const map: Record<string, string> = {}
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8')
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
  }
  const url = map.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon =
    map.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
  const secret = map.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ''
  if (!url || !anon || !secret) {
    throw new Error('Missing Supabase environment variables in .env.local or process.env')
  }
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
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastVal).slice(0, 600)}`)
}

interface CdpCookie {
  name: string
  value: string
}

async function createAuthSession(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<{ cookies: CdpCookie[]; cookieHeader: string; accessToken: string; userId: string }> {
  const jar = new Map<string, string>()
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return Array.from(jar.entries()).map(([name, value]) => ({ name, value }))
      },
      setAll(list) {
        for (const c of list) {
          if (c.value) jar.set(c.name, c.value)
          else jar.delete(c.name)
        }
      },
    },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? 'no session'}`)
  }
  const cookies = Array.from(jar.entries()).map(([name, value]) => ({ name, value }))
  return {
    cookies,
    cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
    accessToken: data.session.access_token,
    userId: data.user.id,
  }
}

class LiveCdpClient {
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
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(msg.error.message))
        else p.resolve(msg.result)
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
        if (typeof resp.status === 'number' && resp.status >= 500 && resp.url?.startsWith(LIVE_URL)) {
          this.serverErrors.push(`${resp.status} ${resp.url}`)
        }
      }
    }
  }

  static async connect(wsUrl: string): Promise<LiveCdpClient> {
    const ws = new WebSocket(wsUrl)
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = () => reject(new Error('CDP WebSocket connect failed'))
    })
    const client = new LiveCdpClient(ws)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Console.enable')
    await client.send('Network.enable')
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    return client
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url })
    await waitFor(
      () => this.eval<string>('document.readyState'),
      (s) => s === 'complete',
      20_000,
      `navigation ${url}`
    )
    await new Promise((r) => setTimeout(r, 700))
  }

  async eval<T>(expression: string): Promise<T> {
    const res = (await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as { result?: { value?: T }; exceptionDetails?: { text?: string } }
    if (res.exceptionDetails) {
      throw new Error(`Browser eval failed: ${res.exceptionDetails.text ?? 'exception'}`)
    }
    return res.result?.value as T
  }

  async setAuthCookies(cookies: CdpCookie[]): Promise<void> {
    await this.send('Network.clearBrowserCookies')
    for (const c of cookies) {
      await this.send('Network.setCookie', {
        name: c.name,
        value: c.value,
        url: LIVE_URL,
        path: '/',
        secure: LIVE_URL.startsWith('https://'),
      })
    }
  }

  clearErrors(): void {
    this.consoleErrors = []
    this.pageErrors = []
    this.serverErrors = []
  }

  close(): void {
    this.ws.close()
  }
}

async function launchChrome(port: number): Promise<{ cdp: LiveCdpClient; cleanup: () => void }> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'examguard-live-qa-'))
  const proc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1366,900',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
    { stdio: 'ignore' }
  )

  const targets = await waitFor(
    async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`)
        if (!res.ok) return []
        return (await res.json()) as Array<{ type: string; webSocketDebuggerUrl?: string }>
      } catch {
        return []
      }
    },
    (list) => list.some((t) => t.type === 'page' && Boolean(t.webSocketDebuggerUrl)),
    15_000,
    'Headless Chrome CDP endpoint'
  )

  const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)!
  const cdp = await LiveCdpClient.connect(pageTarget.webSocketDebuggerUrl!)
  return {
    cdp,
    cleanup: () => {
      try {
        cdp.close()
      } catch {
        // ignore
      }
      try {
        if (process.platform === 'win32' && proc.pid) {
          execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
        } else {
          proc.kill('SIGKILL')
        }
      } catch {
        try {
          proc.kill()
        } catch {
          // ignore
        }
      }
      setTimeout(() => {
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true })
        } catch {
          // ignore
        }
      }, 400).unref()
    },
  }
}

test('Phase 15 Live Deployed Acceptance Test: HTTPS, security policies, faculty exam creation, preflight, AI event, Supabase Realtime, invigilator review, submission & faculty results', async () => {
  assert.ok(LIVE_URL.startsWith('https://'), `LIVE_URL must be HTTPS (received ${LIVE_URL})`)
  assert.ok(fs.existsSync(CHROME_PATH), 'Google Chrome binary must exist for headless live verification')

  const env = loadEnvConfig()
  const adminDb = createClient(env.url, env.secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Verify live HTTPS deployment security & hardware Permissions-Policy headers
  const loginRes = await fetch(`${LIVE_URL}/login`)
  assert.equal(loginRes.status, 200, 'Live /login must return HTTP 200 over HTTPS')
  const permPolicy = loginRes.headers.get('permissions-policy') ?? ''
  assert.ok(permPolicy.includes('camera=(self)'), `Expected camera=(self) in Permissions-Policy, got: "${permPolicy}"`)
  assert.ok(permPolicy.includes('microphone=(self)'), `Expected microphone=(self) in Permissions-Policy, got: "${permPolicy}"`)
  assert.ok(permPolicy.includes('fullscreen=(self)'), `Expected fullscreen=(self) in Permissions-Policy, got: "${permPolicy}"`)
  assert.equal(loginRes.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(loginRes.headers.get('x-frame-options'), 'DENY')

  const visionRes = await fetch(`${LIVE_URL}/mediapipe/vision_bundle.mjs`)
  assert.equal(visionRes.status, 200, 'Hosted MediaPipe vision_bundle.mjs must return 200 on production Vercel')

  // Provision isolated ephemeral tenant + 5 accounts so Demo University remains untouched
  const runTag = `live15-${Date.now().toString(36)}`
  const pass = `LivePass!${crypto.randomBytes(8).toString('hex')}`
  const createdUserIds: string[] = []
  let tenantId: string | null = null
  let disconnectRealtime: (() => Promise<void>) | null = null
  let chromeCleanup: (() => void) | null = null

  async function createRoleUser(prefix: string, role: string, fullName: string) {
    const email = `${runTag}.${prefix}@example.edu`
    const { data, error } = await adminDb.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error || !data.user) throw new Error(`Create user ${prefix} failed: ${error?.message}`)
    createdUserIds.push(data.user.id)

    const { error: pErr } = await adminDb.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: fullName,
    })
    if (pErr) throw new Error(`Upsert public.profiles ${prefix} failed: ${pErr.message}`)

    const { error: mErr } = await adminDb.from('memberships').insert({
      tenant_id: tenantId,
      user_id: data.user.id,
      role,
    })
    if (mErr) throw new Error(`Insert public.memberships ${prefix} failed: ${mErr.message}`)
    return { id: data.user.id, email }
  }

  try {
    const { data: tenant, error: tErr } = await adminDb
      .from('tenants')
      .insert({
        name: `Live Acceptance ${runTag}`,
        slug: `${runTag}-univ`,
        domain: `${runTag}.edu`,
      })
      .select('id')
      .single()
    if (tErr || !tenant) throw new Error(`Tenant insert failed: ${tErr?.message}`)
    tenantId = tenant.id

    const adminUser = await createRoleUser('admin', 'admin', 'Live Admin')
    const facultyUser = await createRoleUser('faculty', 'instructor', 'Live Faculty')
    const invigilatorUser = await createRoleUser('invigilator', 'invigilator', 'Live Invigilator')
    const studentOne = await createRoleUser('student1', 'student', 'Live Student One')
    const studentTwo = await createRoleUser('student2', 'student', 'Live Student Two')

    const courseCode = `LIVE-${Math.floor(100 + Math.random() * 899)}`
    const { data: course, error: cErr } = await adminDb
      .from('courses')
      .insert({
        tenant_id: tenantId,
        instructor_id: facultyUser.id,
        name: 'Distributed Cloud Integrity',
        code: courseCode,
        semester: 'Fall 2026',
      })
      .select('id')
      .single()
    if (cErr || !course) throw new Error(`Course insert failed: ${cErr?.message}`)

    const { error: enErr } = await adminDb.from('enrollments').insert([
      { course_id: course.id, student_id: studentOne.id },
      { course_id: course.id, student_id: studentTwo.id },
    ])
    if (enErr) throw new Error(`Enrollments insert failed: ${enErr.message}`)

    const [adminAuth, facultyAuth, invigAuth, student1Auth, student2Auth] = await Promise.all([
      createAuthSession(env.url, env.anon, adminUser.email, pass),
      createAuthSession(env.url, env.anon, facultyUser.email, pass),
      createAuthSession(env.url, env.anon, invigilatorUser.email, pass),
      createAuthSession(env.url, env.anon, studentOne.email, pass),
      createAuthSession(env.url, env.anon, studentTwo.email, pass),
    ])

    const chrome = await launchChrome(9340 + Math.floor(Math.random() * 500))
    chromeCleanup = chrome.cleanup
    const { cdp } = chrome

    // 2. Verify Admin Dashboard over HTTPS
    await cdp.setAuthCookies(adminAuth.cookies)
    await cdp.navigate(`${LIVE_URL}/admin`)
    const adminBody = await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (t) => t.trim().length > 80,
      15_000,
      'Live /admin dashboard'
    )
    assert.ok(adminBody.length > 80, 'Live /admin rendered cleanly')
    assert.deepEqual(cdp.serverErrors, [], 'Zero 5xx on /admin')

    // 3. Faculty Creates & Publishes an Exam via Live Deployed UI (/faculty/exams/new)
    await cdp.setAuthCookies(facultyAuth.cookies)
    await cdp.navigate(`${LIVE_URL}/faculty/exams/new`)

    const nowLocal = new Date()
    const yyyy = nowLocal.getFullYear()
    const mm = String(nowLocal.getMonth() + 1).padStart(2, '0')
    const dd = String(nowLocal.getDate()).padStart(2, '0')
    const todayInput = `${yyyy}-${mm}-${dd}`
    const examTitle = `Live Acceptance Exam ${runTag}`

    await waitFor(
      () => cdp.eval<boolean>('Boolean(document.querySelector("#wiz-title") && document.querySelector("#wiz-course"))'),
      (ok) => ok,
      15_000,
      'Faculty Exam Wizard Step 1 controls'
    )

    const step1Result = await cdp.eval<boolean>(`(() => {
      const setNative = (el, val) => {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setNative(document.querySelector('#wiz-title'), ${JSON.stringify(examTitle)});
      setNative(document.querySelector('#wiz-course'), ${JSON.stringify(course.id)});
      setNative(document.querySelector('#wiz-date'), ${JSON.stringify(todayInput)});
      setNative(document.querySelector('#wiz-start'), '00:00');
      setNative(document.querySelector('#wiz-end'), '23:59');
      setNative(document.querySelector('#wiz-desc'), 'Live Phase 15 acceptance exam');
      setNative(document.querySelector('#wiz-inst'), 'Keep camera and microphone active throughout.');
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Create draft & add questions/i.test(b.textContent || ''));
      if (!btn) return false;
      btn.click();
      return true;
    })()`)
    assert.equal(step1Result, true, 'Step 1 submit button must click')

    await waitFor(
      () => cdp.eval<boolean>('Boolean(document.querySelector("#q-prompt"))'),
      (ok) => ok,
      20_000,
      'Wizard transition to Step 2 (Question Composer)'
    )

    const q1Prompt = 'Which property prevents stale reads by enforcing server-side Row-Level Security?'
    const q1Added = await cdp.eval<boolean>(`(() => {
      const setNative = (el, val) => {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setNative(document.querySelector('#q-prompt'), ${JSON.stringify(q1Prompt)});
      setNative(document.querySelector('input[placeholder="Enter option A"]'), 'Postgres RLS policy enforcement');
      setNative(document.querySelector('input[placeholder="Enter option B"]'), 'CSS border-radius styling');
      setNative(document.querySelector('input[placeholder="Enter option C"]'), 'Client localStorage caching');
      setNative(document.querySelector('input[placeholder="Enter option D"]'), 'Browser font preloading');
      setNative(document.querySelector('#q-expl'), 'RLS policies execute inside PostgreSQL on every query.');
      const btn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => /Add question/i.test(b.textContent || ''));
      if (!btn) return false;
      btn.click();
      return true;
    })()`)
    assert.equal(q1Added, true, 'Question submit button must exist')

    await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes(q1Prompt),
      20_000,
      'Authored MCQ persisted in Step 2'
    )

    // Lookup newly created exam ID from URL (/faculty/exams/[examId]/edit or ?examId=...)
    const examId = await cdp.eval<string>(`(() => {
      const m = window.location.pathname.match(/\\/faculty\\/exams\\/([^/]+)\\/edit/);
      if (m && m[1]) return m[1];
      return new URLSearchParams(window.location.search).get("examId") || "";
    })()`)
    assert.ok(examId.length > 10, `Expected created examId in URL, got "${examId}"`)

    // Step 4: Assign Student One specifically via exam_assignments UI step
    const clickedStep4 = await cdp.eval<boolean>(`(() => {
      const steps = Array.from(document.querySelectorAll('nav[aria-label="Examination creation steps"] button'));
      const step4Btn = steps[3] || steps.find(b => /Student assignment/i.test(b.textContent || ''));
      if (!step4Btn) return false;
      step4Btn.click();
      return true;
    })()`)
    assert.equal(clickedStep4, true, 'Step 4 stepper button must exist')

    await waitFor(
      () => cdp.eval<string>('document.querySelector("main")?.innerText || document.body.innerText'),
      (txt) => txt.includes(studentOne.email),
      15_000,
      'Step 4 roster loaded with Student One'
    )

    await cdp.eval<boolean>(`(() => {
      const rows = Array.from(document.querySelectorAll('label')).filter(el => (el.textContent || '').includes(${JSON.stringify(studentOne.email)}));
      for (const row of rows) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) { cb.click(); break; }
      }
      return true;
    })()`)

    await new Promise((r) => setTimeout(r, 200))

    await cdp.eval<boolean>(`(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => /Save & continue to monitoring/i.test(b.textContent || ''));
      if (!saveBtn) return false;
      saveBtn.click();
      return true;
    })()`)

    await waitFor(
      () => cdp.eval<string>('document.querySelector("main")?.innerText || document.body.innerText'),
      (txt) => txt.includes('Step 5 —'),
      15_000,
      'Step 4 saved -> transitioned to Step 5 Monitoring'
    )

    // Step 6: Publish examination & Open active window now
    const clickedStep6 = await cdp.eval<boolean>(`(() => {
      const steps = Array.from(document.querySelectorAll('nav[aria-label="Examination creation steps"] button'));
      const step6Btn = steps[5] || steps.find(b => /Preview & publish/i.test(b.textContent || ''));
      if (!step6Btn) return false;
      step6Btn.click();
      return true;
    })()`)
    assert.equal(clickedStep6, true, 'Step 6 stepper button must exist')

    await waitFor(
      () => cdp.eval<string>('document.querySelector("main")?.innerText || document.body.innerText'),
      (txt) => txt.includes('Step 6 —'),
      15_000,
      'Step 6 preview panel mounted'
    )

    await waitFor(
      () => cdp.eval<string>(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /Publish examination/i.test(b.textContent || ''));
        if (btn && !btn.disabled) return 'READY';
        return (document.querySelector('main')?.innerText || '').slice(0, 500);
      })()`),
      (v) => v === 'READY',
      15_000,
      'Publish examination button ready'
    )

    await cdp.eval<void>(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Publish examination/i.test(b.textContent || ''));
      if (btn) btn.click();
    })()`)

    await waitFor(
      () => cdp.eval<boolean>(`Array.from(document.querySelectorAll('[role=dialog] button')).some(b => /Confirm/i.test(b.textContent || ''))`),
      (ok) => ok,
      10_000,
      'Publish confirmation modal'
    )

    await cdp.eval<void>(`(() => {
      const btn = Array.from(document.querySelectorAll('[role=dialog] button')).find(b => /Confirm/i.test(b.textContent || ''));
      if (btn) btn.click();
    })()`)

    await waitFor(
      () => cdp.eval<boolean>(`Array.from(document.querySelectorAll('button')).some(b => /Open active window now/i.test(b.textContent || ''))`),
      (ok) => ok,
      15_000,
      'Published status -> Open active window now button'
    )

    await cdp.eval<void>(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Open active window now/i.test(b.textContent || ''));
      if (btn) btn.click();
    })()`)

    await waitFor(
      async () => {
        const { data } = await adminDb.from('exams').select('status').eq('id', examId).single()
        return data?.status ?? ''
      },
      (st) => st === 'active',
      15_000,
      'Exam transitioned to active in Supabase'
    )

    // Ensure Student One & Student Two have explicit course access (Student One explicitly assigned -> Student Two denied!)
    const student2PaperCheck = await fetch(`${LIVE_URL}/api/student/exams/${examId}`, {
      headers: { Cookie: student2Auth.cookieHeader },
    })
    assert.equal(student2PaperCheck.status, 403, 'Student Two (not in exam_assignments) must be blocked from accessing exam paper')

    // 4. Subscribe Invigilator to live Supabase Realtime BEFORE Student One starts exam
    const invigSupa = createClient(env.url, env.anon, {
      global: { headers: { Authorization: `Bearer ${invigAuth.accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    invigSupa.realtime.setAuth(invigAuth.accessToken)

    const receivedRealtimeEvents: Array<{ id: string; event_type: string; is_simulated?: boolean }> = []
    let realtimeSubscribed = false
    const rtChannel = invigSupa
      .channel(`live-acceptance-${examId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'proctor_events', filter: `exam_id=eq.${examId}` },
        (payload) => {
          const row = payload.new as { id?: string; event_type?: string; metadata?: { isSimulated?: boolean } }
          if (row.id && row.event_type) {
            receivedRealtimeEvents.push({
              id: row.id,
              event_type: row.event_type,
              is_simulated: Boolean(row.metadata?.isSimulated),
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') realtimeSubscribed = true
      })

    disconnectRealtime = async () => {
      await invigSupa.removeChannel(rtChannel)
      await invigSupa.realtime.disconnect()
    }

    await waitFor(async () => realtimeSubscribed, (ok) => ok, 15_000, 'Invigilator Supabase Realtime subscription')

    // 5. Student One views assignment in /student, runs Preflight on live URL
    await cdp.setAuthCookies(student1Auth.cookies)
    await cdp.navigate(`${LIVE_URL}/student`)
    await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (t) => t.includes(examTitle),
      15_000,
      'Student One sees assigned exam in /student'
    )

    await cdp.navigate(`${LIVE_URL}/exam/${examId}/preflight`)
    await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes('Camera') && txt.includes('Microphone') && !txt.includes('Initializing camera') && !txt.includes('Checking permission'),
      25_000,
      'Camera & Microphone preflight checks complete'
    )

    const preflightLaunchReady = await waitFor(
      () => cdp.eval<boolean>(`(() => {
        const cb = document.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) cb.click();
        const btn = Array.from(document.querySelectorAll('button')).find(b => /Begin Examination|Resume Examination/i.test(b.textContent || ''));
        return Boolean(btn && !btn.disabled);
      })()`),
      (ok) => ok,
      20_000,
      'Begin Examination CTA enabled after preflight'
    )
    assert.equal(preflightLaunchReady, true, 'Begin Examination must enable once Camera + Microphone preflight passes')

    // Click Begin Examination -> /exam/[examId]
    cdp.clearErrors()
    await cdp.eval<void>(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Begin Examination|Resume Examination/i.test(b.textContent || ''));
      if (btn) btn.click();
    })()`)

    await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes(q1Prompt),
      20_000,
      'Active examination workspace renders Q1'
    )

    // 6. Wait for actual client AI/proctoring event emitted by live browser (fake video stream has no face -> FACE_NOT_DETECTED)
    await waitFor(
      async () => {
        if (receivedRealtimeEvents.length > 0) return receivedRealtimeEvents.length
        return 0
      },
      (len) => len > 0,
      35_000,
      'Invigilator receives actual proctoring event via Supabase Realtime'
    )

    const actualEvent = receivedRealtimeEvents[0]!
    assert.equal(actualEvent.is_simulated, false, 'Emitted live event must be an authentic AI/monitoring event, not simulated')

    // 7. Invigilator inspects /invigilator over HTTPS and reviews the real event
    await cdp.setAuthCookies(invigAuth.cookies)
    await cdp.navigate(`${LIVE_URL}/invigilator`)
    await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (t) => t.trim().length > 100,
      15_000,
      'Live /invigilator dashboard'
    )

    const reviewRes = await fetch(`${LIVE_URL}/api/monitoring/events/${actualEvent.id}/review`, {
      method: 'PATCH',
      headers: {
        Cookie: invigAuth.cookieHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviewStatus: 'flagged',
        reviewNote: `Verified live event (${actualEvent.event_type}) during Phase 15 acceptance.`,
        escalate: true,
      }),
    })
    assert.equal(reviewRes.status, 200, 'Invigilator event review endpoint must succeed on production')

    const { data: persistedEvent, error: peErr } = await adminDb
      .from('proctor_events')
      .select('id, event_type, review_status, details')
      .eq('id', actualEvent.id)
      .single()
    assert.equal(peErr, null, `Query proctor_events failed: ${peErr?.message}`)
    const persistedStatus =
      persistedEvent?.review_status ??
      (persistedEvent?.details as { reviewStatus?: string } | null)?.reviewStatus
    assert.equal(persistedStatus, 'flagged')

    // 8. Student One answers Q1, reloads to verify answer restoration, & submits examination
    await cdp.setAuthCookies(student1Auth.cookies)
    await cdp.navigate(`${LIVE_URL}/exam/${examId}`)
    await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes('Postgres RLS policy enforcement'),
      15_000,
      'Question 1 options rendered'
    )

    const selectedOptA = await cdp.eval<boolean>(`(() => {
      const btns = Array.from(document.querySelectorAll('button, label'));
      const optA = btns.find(el => (el.textContent || '').includes('Postgres RLS policy enforcement'));
      if (!optA) return false;
      optA.click();
      return true;
    })()`)
    assert.equal(selectedOptA, true, 'Student One selects Option A')

    // Wait for answer sync to finish
    await new Promise((r) => setTimeout(r, 1500))

    // Reload and verify answer remains persisted
    await cdp.navigate(`${LIVE_URL}/exam/${examId}`)
    const restoredSessionRes = await fetch(`${LIVE_URL}/api/student/exams/${examId}/session`, {
      headers: { Cookie: student1Auth.cookieHeader },
    })
    const restoredSessionJson = (await restoredSessionRes.json()) as {
      session?: { id: string }
      answers?: Array<{ selectedOptionId: string | null }>
    }
    const sessionId = restoredSessionJson.session?.id
    assert.ok(sessionId, 'Student One must have active session ID')
    assert.ok(
      (restoredSessionJson.answers ?? []).some((a) => Boolean(a.selectedOptionId)),
      'Saved answer must remain persisted across page reload'
    )

    // 9. Verify Phase 14 DB Column Hardening strictly blocks direct PostgREST tamper on production Supabase!
    const studentSupa = createClient(env.url, env.anon, {
      global: { headers: { Authorization: `Bearer ${student1Auth.accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: tamperErr, data: tamperRows } = await studentSupa
      .from('exam_sessions')
      .update({ score: 999, status: 'graded' })
      .eq('id', sessionId)
      .select('score, status')

    assert.equal(
      tamperErr?.code,
      '42501',
      `Phase 14 column trigger MUST block direct student PostgREST tampering with SQLSTATE 42501! Got err=${tamperErr?.message}, data=${JSON.stringify(tamperRows)}`
    )

    // 10. Student One submits examination in UI
    const openedSubmitModal = await cdp.eval<boolean>(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Submit Exam|Submit/i.test((b.textContent || '').trim()));
      if (!btn) return false;
      btn.click();
      return true;
    })()`)
    assert.equal(openedSubmitModal, true, 'Submit Exam button clicked')

    await waitFor(
      () => cdp.eval<boolean>(`Array.from(document.querySelectorAll('[role=dialog] button')).some(b => /Submit Final Answers/i.test(b.textContent || ''))`),
      (ok) => ok,
      10_000,
      'Submit Final Answers confirmation dialog'
    )

    await cdp.eval<void>(`(() => {
      const btn = Array.from(document.querySelectorAll('[role=dialog] button')).find(b => /Submit Final Answers/i.test(b.textContent || ''));
      if (btn) btn.click();
    })()`)

    await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes('Submission Confirmed') || txt.includes('Submitted'),
      15_000,
      'Submission confirmation receipt screen'
    )

    // 11. Verify answers & graded score persisted in Supabase & Faculty views submission on /faculty/results
    const { data: finalSession } = await adminDb
      .from('exam_sessions')
      .select('status, score')
      .eq('id', sessionId)
      .single()
    assert.equal(finalSession?.status, 'submitted')
    assert.equal(Number(finalSession?.score), 100)

    await cdp.setAuthCookies(facultyAuth.cookies)
    await cdp.navigate(`${LIVE_URL}/faculty/results`)
    const facultyResultsBody = await waitFor(
      () => cdp.eval<string>('document.body.innerText'),
      (txt) => txt.includes('Live Student One') || txt.includes(examTitle),
      20_000,
      'Faculty views Student One submission on /faculty/results'
    )
    assert.ok(
      facultyResultsBody.includes('Live Student One') || facultyResultsBody.includes(examTitle),
      'Faculty results portal must show Student One submitted session'
    )
    assert.deepEqual(cdp.serverErrors, [], 'Zero HTTP 5xx during complete Phase 15 acceptance workflow')
    assert.deepEqual(cdp.pageErrors, [], 'Zero uncaught runtime page errors during live workflow')

    console.log(
      `[PHASE 15 ACCEPTANCE PASSED] Live URL=${LIVE_URL} | examId=${examId} | realtimeEvent=${actualEvent.id} (${actualEvent.event_type}) | score=${finalSession?.score}`
    )
  } catch (err) {
    console.error('[PHASE 15 LIVE ACCEPTANCE FAILED]', err)
    throw err
  } finally {
    if (chromeCleanup) chromeCleanup()
    if (disconnectRealtime) {
      try {
        await disconnectRealtime()
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

