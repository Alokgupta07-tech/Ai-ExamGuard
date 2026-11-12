# AI ExamGuard — Proctoring Models & Detection Intelligence Catalog

This document details the on-device and server-authoritative machine learning and computer vision models running inside AI ExamGuard, their underlying architectures, licenses, inference pipelines, and threshold parameters.

---

## 1. Executive Summary & Privacy Principles

AI ExamGuard uses an **edge-first, privacy-preserving proctoring pipeline**. 

| Core Principle | Implementation Guarantee |
|---|---|
| **Zero Video Stream Exfiltration** | No raw webcam video frames, canvas pixel buffers, or raw audio audio samples are EVER transmitted or saved to backend databases. |
| **Edge Inference** | All facial landmark detection, object classification, and voice activity analysis execute directly inside the candidate's browser using WebAssembly (WASM) and WebGL/WebGPU acceleration. |
| **Structured Metadata Only** | Only sanitized event metadata (event type, normalized confidence, temporal duration, head orientation angles, and bounding box ratios) is sent to server endpoints. |
| **Server-Authoritative Validation** | Client-emitted alerts are cross-validated against cryptographic server clocks, session start bounds, and stateful episode cooldown windows to prevent tampering. |

---

## 2. Model Catalog & Technical Specifications

### A. Object & Electronic Device Detector
* **Model Name:** Google EfficientDet-Lite0 Object Detector (`efficientdet_lite0.tflite`)
* **Framework:** MediaPipe Tasks Vision (`@mediapipe/tasks-vision` v1.2.2)
* **Runtime:** WebAssembly (`/mediapipe/wasm`) with WebGL acceleration
* **Model License:** Apache 2.0 (Official Google Research weight release)
* **Model Size:** ~4.4 MB (quantized float16/int8 tflite model)
* **Target Classes Detected:**
  - `cell phone` (Category ID / Label: `cell phone`)
  - `person` (Category ID / Label: `person`)
  - `laptop` (Category ID / Label: `laptop`)
  - `book` (Category ID / Label: `book`)
* **Detection Frequency:** Every ~320ms in requestAnimationFrame loop (decoupled from the 200ms face loop to preserve frame rates).
* **Thresholds & Temporal Smoothing:**
  - Phone Score Threshold: $\ge 0.45$
  - Sustained Phone Detection Time: $1,800\text{ ms}$ (requires consecutive frames across ~1.8 seconds before emitting `PHONE_DETECTED` to prevent transient hand gesture false positives).
  - Person Count: $\ge 2$ sustained for $\ge 2,500\text{ ms}$ before emitting `ADDITIONAL_PERSON_DETECTED`.
  - Alert Cooldown: $25\text{ seconds}$ between repeated notifications for the same ongoing incident.

### B. Facial Landmark & Attention Radar
* **Model Name:** MediaPipe FaceLandmarker Float16 (`face_landmarker.task`)
* **Framework:** MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
* **Runtime:** WebAssembly (`/mediapipe/wasm`)
* **Model License:** Apache 2.0
* **Landmarks Analyzed:** 478 3D landmarks (including iris pupils: 468, 473)
* **Inference Frequency:** Every 200ms (5 FPS nominal edge loop).
* **Metrics Calculated:**
  - **Yaw ($\psi$):** Nose bridge (landmark 1) relative to inter-pupillary midpoint (landmarks 33, 263). Absolute deviation $> 22^\circ$ for $> 3.5\text{s}$ flags `PROLONGED_OFFSCREEN_GAZE`.
  - **Pitch ($\theta$):** Vertical offset between forehead (landmark 10) and chin (landmark 152). Offsets $> 0.22$ flag sustained downward phone-checking.
  - **Roll ($\phi$):** Angle between left and right eye corners.
  - **Iris Gaze Offset:** Normalized position of pupils (468, 473) within the horizontal eye aperture. Off-center $> 0.38$ flags peripheral gaze diversion without head movement.
  - **Face Obstruction:** Missing or severely skewed landmark distributions indicating hand covering mouth/face.

### C. Acoustic Intelligence & Voice Activity Detection (VAD)
* **Model & Pipeline:** Short-Time Web Audio Spectral Energy Analyzer + Speech Band Energy Concentration Filter
* **Sample Rate:** $16\text{ kHz}$ downsampled PCM Float32 stream via `AudioContext`
* **Analysis Window:** $100\text{ ms}$ sliding Hann window with FFT frequency binning
* **Speech Band Evaluation:** Energy concentration ratio between $300\text{ Hz}$ and $3,400\text{ Hz}$ relative to broad-spectrum noise ($0\text{–}8\text{ kHz}$).
* **Event Classification:**
  - `AUDIO_ACTIVITY`: High acoustic energy (RMS $> 0.055$) with broad spectral distribution (typing, coughing, chair movement, street traffic). Emitted as informational / low severity.
  - `SUSTAINED_SPEECH_ACTIVITY`: Energy concentrated in vocal format range ($> 58\%$ speech ratio) sustained for $> 2.5\text{ seconds}$. Emitted as high-severity proctoring alert and eligible for policy strikes.
* **Constraints & Privacy:** Dynamic noise suppression and echo cancellation enforced on user media tracks; raw audio buffers are processed in volatile memory and immediately discarded.

### D. Browser Security & Sandbox Verification
* **Events Monitored:**
  - `TAB_HIDDEN`: Emitted via Page Visibility API (`visibilitychange`, `document.hidden`) when student switches tabs or minimizes the window.
  - `FULLSCREEN_EXIT`: Emitted via Fullscreen API when the candidate exits full screen mode.
  - `WINDOW_BLUR`: Emitted when candidate clicks outside the exam window.
  - `OFFLINE_SYNC_SAVED`: Monitored via Network Information API and local storage outbox.
* **One-Click Re-entry:** Candidate is presented with a persistent overlay modal with "Return to Fullscreen" if fullscreen is exited.

---

## 3. Failure Mode Matrix & Graceful Degradation

| Failure Mode | Detection Mechanism | System Behavior | Strike Issued? |
|---|---|---|:---:|
| **Webcam Unplugged** | `MediaStreamTrack.onended` / `devicechange` | System flags `CAMERA_DISCONNECTED` | ❌ No (Technical Incident) |
| **Permission Denied** | `NotAllowedError` in `getUserMedia` | Retries allowed, alerts invigilator | ❌ No (Technical Incident) |
| **Network Drop** | `window.onoffline` / fetch failure | Caches answers in local `localStorage` outbox | ❌ No (Local Outbox Sync) |
| **Browser Unsupported** | `navigator.mediaDevices == null` | Pre-flight error with browser guidance | ❌ No (Pre-Flight Gate) |
| **Phone in Frame** | EfficientDet-Lite0 sustained $\ge 1.8\text{s}$ | Dispatches strike dialog, logs strike | ✅ Yes (Integrity Strike) |
| **Second Person** | $\ge 2$ persons sustained $\ge 2.5\text{s}$ | Dispatches strike dialog, logs strike | ✅ Yes (Integrity Strike) |
| **Tab Switched** | Page Visibility API | Dispatches strike dialog, logs strike | ✅ Yes (Integrity Strike) |
| **Sustained Speech** | Web Audio speech-band VAD $\ge 2.5\text{s}$ | Dispatches strike dialog, logs strike | ✅ Yes (Integrity Strike) |
