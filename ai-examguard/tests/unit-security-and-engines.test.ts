import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCsvDocument, escapeCsvCell } from '../lib/utils/csv'
import {
  isSensitiveConfigKey,
  maskSecretValue,
  mergeIntegrationConfigForStorage,
  sanitizeIntegrationConfig,
} from '../lib/integrations/secret-sanitizer'
import {
  assertNoRawFramePayload,
  proctorEventPayloadSchema,
} from '../lib/validators/proctor-events'
import { TemporalProctorFilter } from '../lib/proctoring/temporal-filter'
import {
  MediaPipeModelError,
  extractLandmarkMetrics,
} from '../lib/proctoring/mediapipe-face-monitor'
import {
  SustainedAudioActivityFilter,
  computeShortWindowAudioMetrics,
} from '../lib/proctoring/audio-analyzer'
import {
  deriveAuthoritativeEventSpec,
  evaluateSessionRiskAndCorrelations,
  validateEventTimestamp,
} from '../lib/proctoring/risk-engine'
import { WarningPolicyEngine } from '../lib/proctoring/warning-engine'
import type { ExamIntegrityPolicy } from '../types/proctoring'

test('CSV security: escapes formula injection payloads while preserving negative numbers', () => {
  assert.equal(escapeCsvCell('=cmd|"/C calc"!A0'), `"'=cmd|""/C calc""!A0"`)
  assert.equal(escapeCsvCell('+SUM(A1:A2)'), `"'+SUM(A1:A2)"`)
  assert.equal(escapeCsvCell('@HYPERLINK("http://evil")'), `"'@HYPERLINK(""http://evil"")"`)
  assert.equal(escapeCsvCell('-2+3+cmd'), `"'-2+3+cmd"`)
  assert.equal(escapeCsvCell('\t=1+1'), `"'\t=1+1"`)
  assert.equal(escapeCsvCell('-0.25'), `"-0.25"`)
  assert.equal(escapeCsvCell(-42), `"-42"`)
  assert.equal(escapeCsvCell(null), `""`)

  const doc = buildCsvDocument(['Student', 'Note'], [['=1+1', 'Clean']])
  assert.equal(doc, `"Student","Note"\n"'=1+1","Clean"`)
})

test('Integration secret sanitizer: strips plaintext secrets and preserves redacted metadata', () => {
  assert.equal(isSensitiveConfigKey('clientSecret'), true)
  assert.equal(isSensitiveConfigKey('webhookSecret'), true)
  assert.equal(isSensitiveConfigKey('issuerUrl'), false)
  assert.equal(maskSecretValue('super-secret-value-1234'), '••••1234')

  const merged = mergeIntegrationConfigForStorage({
    existingRawConfig: null,
    publicConfig: {
      issuerUrl: 'https://sso.university.edu',
      clientSecret: 'leaked-in-public-config',
    },
    secretInputs: {
      webhookSecret: 'whsec_test_998877',
    },
  })

  const sanitized = sanitizeIntegrationConfig(merged)
  const serialized = JSON.stringify(sanitized)
  assert.equal(serialized.includes('leaked-in-public-config'), false)
  assert.equal(serialized.includes('whsec_test_998877'), false)
  assert.equal(sanitized.hasConfiguredSecrets, true)
  assert.equal(sanitized.sanitizedConfig.issuerUrl, 'https://sso.university.edu')
  assert.equal('clientSecret' in sanitized.sanitizedConfig, false)
  assert.equal(sanitized.secretSummary.length, 1)
})

test('Proctor payload validator: rejects raw media/frame blobs and accepts structured telemetry', () => {
  assert.throws(
    () =>
      assertNoRawFramePayload({
        clientEventId: '11111111-1111-4111-8111-111111111111',
        nested: { imageData: 'data:image/png;base64,AAAA' },
      }),
    /raw/i
  )

  assert.throws(
    () =>
      assertNoRawFramePayload({
        pcm: [0.1, 0.2],
      }),
    /raw/i
  )

  const parsed = proctorEventPayloadSchema.safeParse({
    clientEventId: '11111111-1111-4111-8111-111111111111',
    context: 'active_exam',
    eventType: 'FACE_NOT_VISIBLE',
    timestamp: new Date().toISOString(),
    durationMs: 4200,
    confidence: 0.91,
    severity: 'critical',
  })
  assert.equal(parsed.success, true)
})

test('Temporal face filter: prevents single-frame false positives and detects sustained anomalies', () => {
  const filter = new TemporalProctorFilter({
    absenceThresholdMs: 3000,
    multipleFaceThresholdMs: 2000,
    minConsecutiveAnomalyFrames: 4,
    alertCooldownMs: 15000,
  })

  // Establish baseline face present
  const baseline = filter.update({
    faceCount: 1,
    landmarkCount: 468,
    centeredInFrame: true,
    primaryBox: null,
    estimatedYawOffset: 0,
    estimatedPitchOffset: 0,
    estimatedRollDegrees: 0,
    isGazeAverted: false,
    isObstructed: false,
    processedAtMs: 1000,
  })
  assert.equal(baseline.faceStatus, 'present')
  assert.equal(baseline.signals.length, 0)

  // Single dropped frame should NOT raise alert
  const singleDrop = filter.update({
    faceCount: 0,
    landmarkCount: 0,
    centeredInFrame: false,
    primaryBox: null,
    estimatedYawOffset: null,
    estimatedPitchOffset: null,
    estimatedRollDegrees: null,
    isGazeAverted: false,
    isObstructed: false,
    processedAtMs: 2000,
  })
  assert.equal(singleDrop.signals.length, 0)

  // Sustained absence across >= 4 frames and >= 3000ms SHOULD raise FACE_NOT_VISIBLE
  let emittedAbsence = false
  for (let i = 1; i <= 5; i += 1) {
    const res = filter.update({
      faceCount: 0,
      landmarkCount: 0,
      centeredInFrame: false,
      primaryBox: null,
      estimatedYawOffset: null,
      estimatedPitchOffset: null,
      estimatedRollDegrees: null,
      isGazeAverted: false,
      isObstructed: false,
      processedAtMs: 2000 + i * 800,
    })
    if (res.signals.some((s) => s.eventType === 'FACE_NOT_VISIBLE')) {
      emittedAbsence = true
    }
  }
  assert.equal(emittedAbsence, true)

  // Multiple faces sustained across >= 4 frames and >= 2000ms
  let emittedMultiple = false
  for (let i = 0; i < 5; i += 1) {
    const res = filter.update({
      faceCount: 2,
      landmarkCount: 468,
      centeredInFrame: true,
      primaryBox: null,
      estimatedYawOffset: 0,
      estimatedPitchOffset: 0,
      estimatedRollDegrees: 0,
      isGazeAverted: false,
      isObstructed: false,
      processedAtMs: 10_000 + i * 600,
    })
    if (res.signals.some((s) => s.eventType === 'MULTIPLE_FACES_DETECTED')) {
      emittedMultiple = true
    }
  }
  assert.equal(emittedMultiple, true)

  // Landmark extractor and MediaPipeModelError stages
  const metrics = extractLandmarkMetrics(
    [[{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.7 }]],
    15_000
  )
  assert.equal(metrics.faceCount, 1)
  assert.equal(metrics.landmarkCount, 2)
  const err = new MediaPipeModelError('Offline failure', 'download_failed')
  assert.equal(err.stage, 'download_failed')
})

test('Audio analyzer & filter: distinguishes acoustic energy vs VAD model and prevents spike alerts', () => {
  const silentBuf = new Float32Array(256).fill(0)
  const silentMetrics = computeShortWindowAudioMetrics(silentBuf, null, 48000, 512, 1000, null)
  assert.equal(silentMetrics.measurementBasis, 'acoustic_energy')
  assert.equal(silentMetrics.rms, 0)

  const loudBuf = new Float32Array(256).fill(0.25)
  const energyMetrics = computeShortWindowAudioMetrics(loudBuf, null, 48000, 512, 2000, null)
  assert.equal(energyMetrics.measurementBasis, 'acoustic_energy')
  assert.equal(energyMetrics.vadSpeechProbability, null)
  assert.ok(energyMetrics.rms > 0.2)

  const vadMetrics = computeShortWindowAudioMetrics(loudBuf, null, 48000, 512, 3000, 0.88)
  assert.equal(vadMetrics.measurementBasis, 'vad_model')
  assert.equal(vadMetrics.vadSpeechProbability, 0.88)

  const audioFilter = new SustainedAudioActivityFilter({
    rmsThreshold: 0.05,
    sustainedThresholdMs: 1500,
    minConsecutiveWindows: 4,
    alertCooldownMs: 10_000,
  })

  // Transient single loud frame must NOT fire
  const spike = audioFilter.update(energyMetrics)
  assert.equal(spike.signal, null)

  // Sustained elevated windows SHOULD fire AUDIO_ACTIVITY
  let detectedSignal = false
  for (let i = 1; i <= 5; i += 1) {
    const win = computeShortWindowAudioMetrics(loudBuf, null, 48000, 512, 2000 + i * 400, null)
    const evalRes = audioFilter.update(win)
    if (evalRes.signal?.eventType === 'AUDIO_ACTIVITY') {
      detectedSignal = true
    }
  }
  assert.equal(detectedSignal, true)
})

test('Risk engine & timestamp validation: coalesces episodes, detects correlations, resists client severity spoofing', () => {
  const now = Date.now()

  const futureCheck = validateEventTimestamp(now + 120_000, now, now - 60_000)
  assert.equal(futureCheck.valid, false)
  assert.equal(futureCheck.errorCode, 'CLIENT_TIMESTAMP_IN_FUTURE')

  const staleCheck = validateEventTimestamp(now - 26 * 60 * 60 * 1000, now, now - 60_000)
  assert.equal(staleCheck.valid, false)
  assert.equal(staleCheck.errorCode, 'STALE_EVENT_TIMESTAMP')

  const preSessionCheck = validateEventTimestamp(now - 20 * 60_000, now, now - 60_000)
  assert.equal(preSessionCheck.valid, false)
  assert.equal(preSessionCheck.errorCode, 'EVENT_PRECEDES_SESSION')

  const validCheck = validateEventTimestamp(now - 5_000, now, now - 60_000)
  assert.equal(validCheck.valid, true)

  // Client severity is untrusted; AUDIO_ACTIVITY without VAD remains low/minor weight
  const spec = deriveAuthoritativeEventSpec('AUDIO_ACTIVITY', 1000, {
    measurementBasis: 'acoustic_energy',
  })
  assert.equal(spec.severity, 'low')
  assert.equal(spec.isEnvironmentalOrTechnical, true)

  // 10 repeated FACE_NOT_VISIBLE events inside EPISODE_GAP_MS coalesce into 1 episode (capped risk)
  const repeatedAbsence = Array.from({ length: 10 }, (_, idx) => ({
    eventId: `ev-abs-${idx}`,
    eventType: 'FACE_NOT_VISIBLE',
    occurredAt: new Date(now - 60_000 + idx * 5_000).toISOString(),
    durationMs: 4000,
    details: {},
  }))

  const singleEpisodeRisk = evaluateSessionRiskAndCorrelations({
    sessionId: 'sess-1',
    examId: 'exam-1',
    universityId: 'uni-1',
    priorEvents: repeatedAbsence.slice(0, 1),
  })
  const tenEventsSameEpisodeRisk = evaluateSessionRiskAndCorrelations({
    sessionId: 'sess-1',
    examId: 'exam-1',
    universityId: 'uni-1',
    priorEvents: repeatedAbsence,
  })
  assert.equal(
    tenEventsSameEpisodeRisk.assessment.riskScore,
    singleEpisodeRisk.assessment.riskScore
  )
  assert.equal(tenEventsSameEpisodeRisk.assessment.riskCategory, 'NORMAL')
  assert.equal(tenEventsSameEpisodeRisk.assessment.autoDisqualified, false)

  // Correlated multi-signal pattern (MULTIPLE_FACES_DETECTED + AUDIO_ACTIVITY + TAB_HIDDEN + FACE_NOT_VISIBLE) -> escalates
  const correlated = evaluateSessionRiskAndCorrelations({
    sessionId: 'sess-2',
    examId: 'exam-1',
    universityId: 'uni-1',
    priorEvents: [
      {
        eventId: 'c1',
        eventType: 'MULTIPLE_FACES_DETECTED',
        occurredAt: new Date(now - 90_000).toISOString(),
        durationMs: 8000,
        details: {},
      },
      {
        eventId: 'c2',
        eventType: 'AUDIO_ACTIVITY',
        occurredAt: new Date(now - 75_000).toISOString(),
        durationMs: 6000,
        details: { measurementBasis: 'vad_model', isSpeechClassified: true },
      },
      {
        eventId: 'c3',
        eventType: 'FACE_NOT_VISIBLE',
        occurredAt: new Date(now - 50_000).toISOString(),
        durationMs: 12000,
        details: {},
      },
      {
        eventId: 'c4',
        eventType: 'TAB_HIDDEN',
        occurredAt: new Date(now - 35_000).toISOString(),
        durationMs: 32000,
        details: {},
      },
    ],
  })
  assert.ok(correlated.assessment.correlations.length >= 2)
  assert.equal(correlated.assessment.riskCategory, 'PRIORITY_REVIEW')
  assert.equal(correlated.assessment.autoDisqualified, false)
  assert.ok(correlated.assessment.summaryExplanation.length > 20)
})

test('WarningPolicyEngine: classifies strike eligibility and preserves technical incidents as non-strikes', () => {
  const policy: ExamIntegrityPolicy = {
    id: 'p-1',
    examId: 'ex-1',
    tenantId: 'tenant-1',
    maxWarnings: 3,
    warningCooldownSeconds: 20,
    autoSubmissionEnabled: true,
    phoneDetectionStrike: true,
    additionalPersonStrike: true,
    multipleFacesStrike: true,
    tabSwitchStrike: true,
    fullscreenRequired: true,
    audioVadStrike: true,
    gazeDeviationStrike: true,
    version: 1,
  }

  // Misconduct violations qualify for strikes
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('PHONE_DETECTED', policy), true)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('ADDITIONAL_PERSON_DETECTED', policy), true)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('MULTIPLE_FACES_DETECTED', policy), true)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('TAB_HIDDEN', policy), true)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('SUSTAINED_SPEECH_ACTIVITY', policy), true)

  // Technical failures MUST NOT be treated as misconduct strikes
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('CAMERA_DISCONNECTED', policy), false)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('CAMERA_PERMISSION_DENIED', policy), false)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('MICROPHONE_DISCONNECTED', policy), false)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('MICROPHONE_PERMISSION_DENIED', policy), false)
  assert.equal(WarningPolicyEngine.isEventEligibleForStrike('OBJECT_DETECTION_UNAVAILABLE', policy), false)

  // Warning text progression
  const w1 = WarningPolicyEngine.formatWarningMessage(1, 3, 'PHONE_DETECTED', 'Mobile phone detected')
  assert.ok(w1.title.includes('Warning 1 of 3'))
  assert.ok(w1.title.includes('Examination Integrity Notice'))
  assert.ok(w1.message.includes('examination integrity event has been detected'))

  const w2 = WarningPolicyEngine.formatWarningMessage(2, 3, 'TAB_HIDDEN', 'Tab switched')
  assert.ok(w2.title.includes('Warning 2 of 3'))
  assert.ok(w2.title.includes('Final Warning'))

  const w3 = WarningPolicyEngine.formatWarningMessage(3, 3, 'PHONE_DETECTED', 'Mobile phone detected')
  assert.ok(w3.title.includes('Automatically Submitted'))
  assert.ok(w3.message.includes('safely recorded'))
})
