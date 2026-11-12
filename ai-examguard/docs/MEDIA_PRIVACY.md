# AI ExamGuard — Media Privacy, Compliance & Data Protection Policy

This document details AI ExamGuard's compliance with GDPR (Art. 5, Art. 9, Art. 32), FERPA (34 CFR Part 99), and standard higher-education data protection mandates.

---

## 1. Core Privacy Tenets

1. **Edge-Local Inference:**
   - Facial landmark meshes, iris gaze estimates, object bounding boxes, and audio FFT metrics are processed locally in the user's browser memory via WebAssembly/WebGPU.
   - Raw video frames are **never** stored in databases.
2. **Real-Time Ephemeral WebRTC:**
   - Video surveillance tracks are distributed in real time via LiveKit SFU directly to authorized invigilators.
   - By default, continuous recording to cloud storage is **DISABLED**.
   - If institutional policy explicitly requires recording, statutory notice is presented to students before entering, and records are retained under encrypted 30-day lifecycle policies.
3. **Audit Trail for Invigilator Access:**
   - Every time an invigilator opens, views, or expands a candidate's video feed, an immutable row is recorded in `monitoring_access_audit` with the invigilator ID, timestamp, session ID, and IP address.
4. **No Biometric Emotion or Honesty Profiling:**
   - AI ExamGuard strictly prohibits using facial micro-expressions or emotion recognition to accuse candidates of dishonesty or stress. Monitoring is confined to measurable physical presence, device appearance, and window visibility.

