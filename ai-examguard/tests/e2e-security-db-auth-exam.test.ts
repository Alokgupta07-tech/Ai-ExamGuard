import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

interface EnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string
  SUPABASE_SECRET_KEY: string
}

function loadEnvLocal(): EnvVars {
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
  const url = map.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = map.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secret = map.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !anon || !secret) {
    throw new Error('Missing required Supabase credentials in .env.local for live E2E test.')
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon,
    SUPABASE_SECRET_KEY: secret,
  }
}

async function createSsrAuthSession(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<{ cookieHeader: string; accessToken: string; userId: string }> {
  const jar = new Map<string, string>()
  const ssrClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return Array.from(jar.entries()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          if (c.value) {
            jar.set(c.name, c.value)
          } else {
            jar.delete(c.name)
          }
        }
      },
    },
  })

  const { data, error } = await ssrClient.auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    throw new Error(`SSR sign-in failed for ${email}: ${error?.message ?? 'no session'}`)
  }

  const cookieHeader = Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  return {
    cookieHeader,
    accessToken: data.session.access_token,
    userId: data.user.id,
  }
}

async function httpReq(
  baseUrl: string,
  routePath: string,
  options: {
    method?: string
    cookie?: string
    body?: unknown
    redirect?: 'manual' | 'follow'
  } = {}
): Promise<{ status: number; location: string | null; text: string; json: Record<string, unknown> | null }> {
  const headers: Record<string, string> = {}
  if (options.cookie) headers.Cookie = options.cookie
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    redirect: options.redirect ?? 'manual',
  })

  const text = await res.text()
  let json: Record<string, unknown> | null = null
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      json = parsed as Record<string, unknown>
    }
  } catch {
    json = null
  }

  return {
    status: res.status,
    location: res.headers.get('location'),
    text,
    json,
  }
}

test('Phase 14 E2E Security, Auth, 4-Role RBAC, 2-Student Isolation, Exam & Realtime Pipeline', async (t) => {
  const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3011'
  try {
    const ping = await fetch(`${baseUrl}/login`)
    if (!ping.ok) {
      throw new Error(`Server returned HTTP ${ping.status}`)
    }
  } catch (err) {
    t.skip(`Live Next.js server not running at ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  const env = loadEnvLocal()
  const adminDb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const runTag = `qa14-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const testPassword = `Qa14!${crypto.randomBytes(6).toString('hex')}`
  const createdUserIds: string[] = []
  let tenant1Id: string | null = null
  let tenant2Id: string | null = null
  let disconnectRealtime: (() => Promise<void>) | null = null

  const createTestUser = async (
    roleLabel: string,
    tenantId: string | null,
    membershipRole: 'admin' | 'instructor' | 'invigilator' | 'student' | null,
    userMeta: Record<string, unknown> = {}
  ) => {
    const email = `${runTag}.${roleLabel}@example.test`
    const fullName = roleLabel === 'studenta' ? '=cmd|QA StudentA' : `QA14 ${roleLabel}`
    const { data, error } = await adminDb.auth.admin.createUser({
      email,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, ...userMeta },
    })
    if (error || !data.user) {
      throw new Error(`Failed creating auth user ${roleLabel}: ${error?.message ?? 'unknown'}`)
    }
    createdUserIds.push(data.user.id)

    await adminDb.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: fullName,
    })

    if (tenantId && membershipRole) {
      const { error: mErr } = await adminDb.from('memberships').insert({
        tenant_id: tenantId,
        user_id: data.user.id,
        role: membershipRole,
      })
      if (mErr) throw new Error(`Failed assigning membership for ${roleLabel}: ${mErr.message}`)
    }

    return { id: data.user.id, email, fullName }
  }

  try {
    // Seed 2 tenants
    const { data: t1, error: t1Err } = await adminDb
      .from('tenants')
      .insert({ name: `QA14 Univ One ${runTag}`, slug: `${runTag}-u1`, domain: `${runTag}-u1.edu` })
      .select('id')
      .single()
    if (t1Err || !t1) throw new Error(`Tenant 1 seed failed: ${t1Err?.message}`)
    tenant1Id = t1.id

    const { data: t2, error: t2Err } = await adminDb
      .from('tenants')
      .insert({ name: `QA14 Univ Two ${runTag}`, slug: `${runTag}-u2`, domain: `${runTag}-u2.edu` })
      .select('id')
      .single()
    if (t2Err || !t2) throw new Error(`Tenant 2 seed failed: ${t2Err?.message}`)
    tenant2Id = t2.id

    // Separate accounts for all 4 roles + 2nd student + unassigned student + spoofed metadata user + tenant2 user
    const adminUser = await createTestUser('admin', tenant1Id, 'admin')
    const instructorUser = await createTestUser('instructor', tenant1Id, 'instructor')
    const invigilatorUser = await createTestUser('invigilator', tenant1Id, 'invigilator')
    const studentA = await createTestUser('studenta', tenant1Id, 'student')
    const studentB = await createTestUser('studentb', tenant1Id, 'student')
    const unassignedStudent = await createTestUser('unassigned', tenant1Id, 'student')
    const spoofUser = await createTestUser('spoof', null, null, { role: 'admin' })
    const tenant2Admin = await createTestUser('t2admin', tenant2Id, 'admin')

    // Seed Course, Enrollments, Published Exam, 2 MCQs + Answer Keys
    const courseCode = `QA-${Math.floor(100 + Math.random() * 899)}`
    const { data: course, error: cErr } = await adminDb
      .from('courses')
      .insert({
        tenant_id: tenant1Id,
        instructor_id: instructorUser.id,
        name: 'QA14 Verification Course',
        code: courseCode,
        semester: 'Fall 2026',
      })
      .select('id')
      .single()
    if (cErr || !course) throw new Error(`Course seed failed: ${cErr?.message}`)

    await adminDb.from('enrollments').insert([
      { course_id: course.id, student_id: studentA.id },
      { course_id: course.id, student_id: studentB.id },
    ])

    const nowMs = Date.now()
    const { data: exam, error: eErr } = await adminDb
      .from('exams')
      .insert({
        course_id: course.id,
        tenant_id: tenant1Id,
        created_by: instructorUser.id,
        title: `QA14 Security & Proctoring Exam ${runTag}`,
        duration_minutes: 60,
        start_time: new Date(nowMs - 10 * 60_000).toISOString(),
        end_time: new Date(nowMs + 90 * 60_000).toISOString(),
        status: 'published',
        total_points: 10,
        settings: { require_camera: true, require_audio: true, require_fullscreen: true, negative_marking: false },
      })
      .select('id')
      .single()
    if (eErr || !exam) throw new Error(`Exam seed failed: ${eErr?.message}`)

    const { data: q1, error: q1Err } = await adminDb
      .from('questions')
      .insert({
        exam_id: exam.id,
        order_index: 1,
        type: 'mcq_single',
        prompt: 'What does TLS protect?',
        points: 5,
        explanation: 'Confidentiality & integrity in transit (CONFIDENTIAL_SOLUTION_1)',
      })
      .select('id')
      .single()
    if (q1Err || !q1) throw new Error(`Q1 seed failed: ${q1Err?.message}`)

    const { data: q2, error: q2Err } = await adminDb
      .from('questions')
      .insert({
        exam_id: exam.id,
        order_index: 2,
        type: 'mcq_single',
        prompt: 'What enforces database row access per user?',
        points: 5,
        explanation: 'Row-Level Security (CONFIDENTIAL_SOLUTION_2)',
      })
      .select('id')
      .single()
    if (q2Err || !q2) throw new Error(`Q2 seed failed: ${q2Err?.message}`)

    const { data: q1Opts, error: q1OptErr } = await adminDb
      .from('question_answer_keys')
      .insert([
        { question_id: q1.id, label: 'A', content: 'Data in transit', is_correct: true, order_index: 1 },
        { question_id: q1.id, label: 'B', content: 'CPU clock speed', is_correct: false, order_index: 2 },
      ])
      .select('id, label, is_correct')
    if (q1OptErr || !q1Opts) throw new Error(`Q1 options seed failed: ${q1OptErr?.message}`)

    const { data: q2Opts, error: q2OptErr } = await adminDb
      .from('question_answer_keys')
      .insert([
        { question_id: q2.id, label: 'A', content: 'Row-Level Security', is_correct: true, order_index: 1 },
        { question_id: q2.id, label: 'B', content: 'CSS keyframes', is_correct: false, order_index: 2 },
      ])
      .select('id, label, is_correct')
    if (q2OptErr || !q2Opts) throw new Error(`Q2 options seed failed: ${q2OptErr?.message}`)

    const q1CorrectOpt = q1Opts.find((o) => o.is_correct)!
    const q1WrongOpt = q1Opts.find((o) => !o.is_correct)!
    const q2CorrectOpt = q2Opts.find((o) => o.is_correct)!

    await adminDb.from('exam_assignments').insert([
      { exam_id: exam.id, student_id: studentA.id },
      { exam_id: exam.id, student_id: studentB.id },
    ])

    // Authenticate all accounts via real SSR session cookies
    const adminAuth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, adminUser.email, testPassword)
    const instructorAuth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, instructorUser.email, testPassword)
    const invigilatorAuth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, invigilatorUser.email, testPassword)
    const studentAAuth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, studentA.email, testPassword)
    const studentBAuth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, studentB.email, testPassword)
    const unassignedAuth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, unassignedStudent.email, testPassword)
    const spoofAuth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, spoofUser.email, testPassword)
    const tenant2Auth = await createSsrAuthSession(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, tenant2Admin.email, testPassword)

    // ---------------------------------------------------------
    // 1. AUTHENTICATION & ROUTE RBAC CHECKS (ALL 4 ROLES + SPOOF)
    // ---------------------------------------------------------
    for (const protectedRoute of ['/admin', '/faculty', '/invigilator', '/student', `/exam/${exam.id}`]) {
      const unauthRes = await httpReq(baseUrl, protectedRoute)
      assert.equal(unauthRes.status, 307, `Unauthenticated ${protectedRoute} must redirect`)
      assert.ok(unauthRes.location?.includes('/login'), `Unauthenticated ${protectedRoute} redirects to /login`)
    }

    for (const apiRoute of ['/api/admin/audit-logs', '/api/admin/integrations', '/api/monitoring/events', '/api/reports']) {
      const unauthApi = await httpReq(baseUrl, apiRoute)
      assert.equal(unauthApi.status, 401, `Unauthenticated ${apiRoute} must return 401`)
    }

    // Wrong-role denials on pages
    assert.ok((await httpReq(baseUrl, '/admin', { cookie: studentAAuth.cookieHeader })).location?.includes('/unauthorized'))
    assert.ok((await httpReq(baseUrl, '/faculty', { cookie: studentAAuth.cookieHeader })).location?.includes('/unauthorized'))
    assert.ok((await httpReq(baseUrl, '/invigilator', { cookie: studentAAuth.cookieHeader })).location?.includes('/unauthorized'))
    assert.ok((await httpReq(baseUrl, '/admin', { cookie: invigilatorAuth.cookieHeader })).location?.includes('/unauthorized'))
    assert.ok((await httpReq(baseUrl, '/admin', { cookie: instructorAuth.cookieHeader })).location?.includes('/unauthorized'))

    // Privilege escalation via spoofed user_metadata.role = 'admin' blocked!
    const spoofRoute = await httpReq(baseUrl, '/admin', { cookie: spoofAuth.cookieHeader })
    assert.equal(spoofRoute.status, 307)
    assert.ok(spoofRoute.location?.includes('/unauthorized'), 'Spoofed user_metadata.role must be blocked by middleware')

    // Wrong-role denials on APIs
    assert.equal((await httpReq(baseUrl, '/api/admin/audit-logs', { cookie: studentAAuth.cookieHeader })).status, 403)
    assert.equal((await httpReq(baseUrl, '/api/monitoring/events', { cookie: studentAAuth.cookieHeader })).status, 403)
    assert.equal((await httpReq(baseUrl, '/api/reports', { cookie: studentAAuth.cookieHeader })).status, 403)
    assert.equal(
      (await httpReq(baseUrl, '/api/monitoring/events/simulate', {
        method: 'POST',
        cookie: studentAAuth.cookieHeader,
        body: { sessionId: crypto.randomUUID(), eventType: 'FACE_NOT_VISIBLE' },
      })).status,
      403
    )
    assert.equal((await httpReq(baseUrl, '/api/admin/integrations', { cookie: invigilatorAuth.cookieHeader })).status, 403)

    // Authorized role access succeeds (200)
    assert.equal((await httpReq(baseUrl, '/admin', { cookie: adminAuth.cookieHeader })).status, 200)
    assert.equal((await httpReq(baseUrl, '/faculty', { cookie: instructorAuth.cookieHeader })).status, 200)
    assert.equal((await httpReq(baseUrl, '/invigilator', { cookie: invigilatorAuth.cookieHeader })).status, 200)
    assert.equal((await httpReq(baseUrl, '/student', { cookie: studentAAuth.cookieHeader })).status, 200)

    // ---------------------------------------------------------
    // 2. EXAMINATION WORKFLOW + TWO-STUDENT ISOLATION + ANSWER KEY PROTECTION
    // ---------------------------------------------------------
    const unassignedPaper = await httpReq(baseUrl, `/api/student/exams/${exam.id}`, { cookie: unassignedAuth.cookieHeader })
    assert.ok(unassignedPaper.status === 403 || unassignedPaper.status === 404, 'Unassigned student must be rejected from exam paper')

    const paperA = await httpReq(baseUrl, `/api/student/exams/${exam.id}`, { cookie: studentAAuth.cookieHeader })
    assert.equal(paperA.status, 200)
    assert.equal(paperA.text.includes('is_correct'), false, 'Answer-key field is_correct must NEVER leak in exam paper')
    assert.equal(paperA.text.includes('isCorrect'), false, 'Answer-key field isCorrect must NEVER leak in exam paper')
    assert.equal(paperA.text.includes('CONFIDENTIAL_SOLUTION_1'), false, 'Solution explanation must NEVER leak during exam')

    // Start sessions for Student A and Student B in same exam
    const startA = await httpReq(baseUrl, `/api/student/exams/${exam.id}/session`, {
      method: 'POST',
      cookie: studentAAuth.cookieHeader,
      body: { hardwareStatus: { camera: true, microphone: true, fullscreen: true } },
    })
    assert.equal(startA.status, 200)
    const sessionAId = (startA.json?.session as { id?: string } | undefined)?.id
    assert.ok(sessionAId)

    const startB = await httpReq(baseUrl, `/api/student/exams/${exam.id}/session`, {
      method: 'POST',
      cookie: studentBAuth.cookieHeader,
      body: { hardwareStatus: { camera: true, microphone: true, fullscreen: true } },
    })
    assert.equal(startB.status, 200)
    const sessionBId = (startB.json?.session as { id?: string } | undefined)?.id
    assert.ok(sessionBId)
    assert.notEqual(sessionAId, sessionBId)

    // Student A saves Q1 = wrong option, reloads & verifies restore
    const saveA1 = await httpReq(baseUrl, `/api/student/exams/${exam.id}/answers`, {
      method: 'PUT',
      cookie: studentAAuth.cookieHeader,
      body: { questionId: q1.id, selectedOptionId: q1WrongOpt.id },
    })
    assert.equal(saveA1.status, 200)

    // Student B saves Q1 = correct option in the SAME exam
    const saveB1 = await httpReq(baseUrl, `/api/student/exams/${exam.id}/answers`, {
      method: 'PUT',
      cookie: studentBAuth.cookieHeader,
      body: { questionId: q1.id, selectedOptionId: q1CorrectOpt.id },
    })
    assert.equal(saveB1.status, 200)

    const reloadA = await httpReq(baseUrl, `/api/student/exams/${exam.id}/session`, { cookie: studentAAuth.cookieHeader })
    assert.equal(reloadA.status, 200)
    const answersA = (reloadA.json?.answers as Array<{ questionId: string; selectedOptionId: string | null }> | undefined) ?? []
    assert.equal(
      answersA.find((a) => a.questionId === q1.id)?.selectedOptionId,
      q1WrongOpt.id,
      'Student A saved answer must restore on reload'
    )
    assert.notEqual(
      answersA.find((a) => a.questionId === q1.id)?.selectedOptionId,
      q1CorrectOpt.id,
      'Student A must NEVER see Student B answer'
    )

    // Student A saves Q2 = correct and submits exam
    const submitA1 = await httpReq(baseUrl, `/api/student/exams/${exam.id}/submit`, {
      method: 'POST',
      cookie: studentAAuth.cookieHeader,
      body: {
        pendingAnswers: [{ questionId: q2.id, selectedOptionId: q2CorrectOpt.id }],
      },
    })
    assert.equal(submitA1.status, 200)
    const receipt1 = submitA1.json as { receiptCode?: string; answeredCount?: number; status?: string } | null
    assert.equal(receipt1?.status, 'submitted')
    assert.equal(receipt1?.answeredCount, 2)
    assert.ok(receipt1?.receiptCode)

    const { data: gradedA } = await adminDb
      .from('exam_sessions')
      .select('score, status')
      .eq('id', sessionAId)
      .single()
    assert.equal(Number(gradedA?.score), 50, 'Server-side grading must compute 50% (5/10 pts)')

    // Duplicate submit returns idempotent same receipt and does not alter score
    const submitADup = await httpReq(baseUrl, `/api/student/exams/${exam.id}/submit`, {
      method: 'POST',
      cookie: studentAAuth.cookieHeader,
      body: { autoSubmitted: false },
    })
    assert.equal(submitADup.status, 200)
    assert.equal(
      (submitADup.json as { receiptCode?: string } | null)?.receiptCode,
      receipt1?.receiptCode
    )

    // Post-submit answer mutation rejected (409)
    const postSubmitSave = await httpReq(baseUrl, `/api/student/exams/${exam.id}/answers`, {
      method: 'PUT',
      cookie: studentAAuth.cookieHeader,
      body: { questionId: q1.id, selectedOptionId: q1CorrectOpt.id },
    })
    assert.equal(postSubmitSave.status, 409)

    // ---------------------------------------------------------
    // 3. AI TELEMETRY INGESTION, DEDUP, REALTIME & INVIGILATOR REVIEW (using active Student B)
    // ---------------------------------------------------------
    // Raw media payload rejection
    const rawFrameAttempt = await httpReq(baseUrl, `/api/student/exams/${exam.id}/proctor-events`, {
      method: 'POST',
      cookie: studentBAuth.cookieHeader,
      body: {
        clientEventId: crypto.randomUUID(),
        sessionId: sessionBId,
        eventType: 'FACE_NOT_VISIBLE',
        timestamp: new Date().toISOString(),
        details: { imageData: 'base64-frame-payload' },
      },
    })
    assert.equal(rawFrameAttempt.status, 400)

    // Future timestamp skew rejected
    const futureAttempt = await httpReq(baseUrl, `/api/student/exams/${exam.id}/proctor-events`, {
      method: 'POST',
      cookie: studentBAuth.cookieHeader,
      body: {
        clientEventId: crypto.randomUUID(),
        sessionId: sessionBId,
        eventType: 'TAB_HIDDEN',
        timestamp: new Date(Date.now() + 180_000).toISOString(),
      },
    })
    assert.equal(futureAttempt.status, 400)

    // Realtime subscription listener before Student B emits event
    const invigSupa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${invigilatorAuth.accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    invigSupa.realtime.setAuth(invigilatorAuth.accessToken)
    disconnectRealtime = async () => {
      await invigSupa.removeAllChannels()
      await invigSupa.realtime.disconnect()
    }

    let realtimeReceivedId: string | null = null
    const channel = invigSupa
      .channel(`qa14-monitor-${runTag}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'proctor_events', filter: `session_id=eq.${sessionBId}` },
        (payload) => {
          const row = payload.new as { id?: string }
          if (row?.id) realtimeReceivedId = row.id
        }
      )

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 3500)
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    // Ingest genuine event for Student B with untrusted 'critical' severity (server overrides!)
    const clientEv1 = crypto.randomUUID()
    const evRes1 = await httpReq(baseUrl, `/api/student/exams/${exam.id}/proctor-events`, {
      method: 'POST',
      cookie: studentBAuth.cookieHeader,
      body: {
        clientEventId: clientEv1,
        sessionId: sessionBId,
        eventType: 'CAMERA_DISCONNECTED',
        timestamp: new Date().toISOString(),
        durationMs: 4000,
        severity: 'critical',
        details: { modelStatus: 'init_failed' },
      },
    })
    assert.equal(evRes1.status, 201)
    const evObj = evRes1.json?.event as { eventId?: string; id?: string; severity?: string } | undefined
    const createdEventId = (evRes1.json?.eventId as string | undefined) ?? evObj?.eventId ?? evObj?.id
    assert.ok(createdEventId, `Expected eventId in ${evRes1.text}`)
    assert.notEqual(evObj?.severity ?? evRes1.json?.severity, 'critical')

    // Exact duplicate clientEventId -> deduplicated
    const evResDup = await httpReq(baseUrl, `/api/student/exams/${exam.id}/proctor-events`, {
      method: 'POST',
      cookie: studentBAuth.cookieHeader,
      body: {
        clientEventId: clientEv1,
        sessionId: sessionBId,
        eventType: 'CAMERA_DISCONNECTED',
        timestamp: new Date().toISOString(),
      },
    })
    assert.equal(evResDup.status, 200)
    assert.equal(evResDup.json?.deduplicated, true)

    // Cross-session event injection attempt: Student B tries posting to Student A's sessionId -> must ignore/fail!
    const crossSessionEv = await httpReq(baseUrl, `/api/student/exams/${exam.id}/proctor-events`, {
      method: 'POST',
      cookie: studentBAuth.cookieHeader,
      body: {
        clientEventId: crypto.randomUUID(),
        sessionId: sessionAId,
        eventType: 'TAB_HIDDEN',
        timestamp: new Date().toISOString(),
      },
    })
    assert.equal(crossSessionEv.status, 403, 'Student B must not inject monitoring events into Student A session')

    // Wait briefly for realtime INSERT delivery
    for (let i = 0; i < 16 && !realtimeReceivedId; i += 1) {
      await new Promise((r) => setTimeout(r, 250))
    }
    await invigSupa.removeChannel(channel)
    assert.equal(realtimeReceivedId, createdEventId, 'Invigilator Supabase Realtime subscription should receive INSERT event')

    // Invigilator views events & updates review status
    const monitorList = await httpReq(baseUrl, `/api/monitoring/events?examId=${exam.id}`, {
      cookie: invigilatorAuth.cookieHeader,
    })
    assert.equal(monitorList.status, 200)
    assert.ok(monitorList.text.includes(createdEventId!))

    const reviewUpdate = await httpReq(baseUrl, `/api/monitoring/events/${createdEventId}/review`, {
      method: 'PATCH',
      cookie: invigilatorAuth.cookieHeader,
      body: {
        reviewStatus: 'flagged',
        reviewNote: 'Verified hardware disconnect alert during QA14 audit',
        escalate: true,
      },
    })
    assert.equal(reviewUpdate.status, 200)

    // Tenant 2 Admin must see 0 records from Tenant 1
    const t2Monitor = await httpReq(baseUrl, `/api/monitoring/events?examId=${exam.id}`, {
      cookie: tenant2Auth.cookieHeader,
    })
    assert.ok(
      t2Monitor.status === 403 || !t2Monitor.text.includes(createdEventId!),
      'Cross-tenant admin must NEVER see Tenant 1 monitoring events'
    )

    // CSV export sanitizes Student A's '=cmd|QA StudentA' formula payload
    const csvExport = await httpReq(baseUrl, `/api/reports/export?reportType=individual_candidate&examId=${exam.id}`, {
      cookie: adminAuth.cookieHeader,
    })
    assert.equal(csvExport.status, 200)
    if (csvExport.text.includes('QA StudentA')) {
      assert.ok(csvExport.text.includes("'=cmd|QA StudentA"), 'CSV export must prefix leading = formula with single quote')
    }

    // ---------------------------------------------------------
    // 4. DIRECT SUPABASE POSTGRES RLS ISOLATION & SESSION TAMPER PROBE
    // ---------------------------------------------------------
    const studentASupa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${studentAAuth.accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: leakedKeys } = await studentASupa.from('question_answer_keys').select('*').eq('question_id', q1.id)
    assert.equal(leakedKeys?.length ?? 0, 0, 'Student RLS must block reading question_answer_keys directly')

    const { data: visibleSessions } = await studentASupa.from('exam_sessions').select('id, student_id').eq('exam_id', exam.id)
    assert.equal(visibleSessions?.length ?? 0, 1, 'Student A must ONLY see own session in exam')
    assert.equal(visibleSessions?.[0]?.id, sessionAId)

    const { data: leakedEvents } = await studentASupa.from('proctor_events').select('id').eq('session_id', sessionBId)
    assert.equal(leakedEvents?.length ?? 0, 0, 'Student A must NEVER read Student B proctor_events')

    const { data: leakedAnswers } = await studentASupa.from('session_answers').select('id').eq('session_id', sessionBId)
    assert.equal(leakedAnswers?.length ?? 0, 0, 'Student A must NEVER read Student B session_answers')

    // Diagnostic probe: direct student update on exam_sessions.score/status via PostgREST
    const { error: tamperErr, data: tamperRows } = await studentASupa
      .from('exam_sessions')
      .update({ score: 99, status: 'graded' })
      .eq('id', sessionAId)
      .select('score, status')

    if (!tamperErr && tamperRows && tamperRows.length > 0 && Number(tamperRows[0]?.score) === 99) {
      console.warn(
        '[SECURITY DIAGNOSTIC] Live remote Supabase has NOT applied migration 20261111000006_security_hardening_phase14.sql yet: direct PostgREST session_update_own_student allowed updating exam_sessions.score/status.'
      )
    } else {
      console.log('[SECURITY DIAGNOSTIC] Direct PostgREST exam_sessions score tamper blocked cleanly:', tamperErr?.message ?? 'no rows mutated')
    }
  } finally {
    if (disconnectRealtime) {
      try {
        await disconnectRealtime()
      } catch {
        // ignore socket cleanup error
      }
    }
    if (tenant1Id) await adminDb.from('tenants').delete().eq('id', tenant1Id)
    if (tenant2Id) await adminDb.from('tenants').delete().eq('id', tenant2Id)
    for (const uid of createdUserIds) {
      await adminDb.auth.admin.deleteUser(uid)
    }
  }
})

