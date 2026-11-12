# AI ExamGuard — Technical Security Boundaries & Proctoring Limitations

In the spirit of honest enterprise engineering, this document outlines the boundary between browser-sandbox capabilities and native operating system controls, detailing what AI ExamGuard can enforce, what requires native tools, and our roadmap for lock-down browser integrations.

---

## 1. What Browser-Based Proctoring Enforces Exceptionally Well

| Threat Vector | Browser Mechanism | Detection Precision |
|---|---|:---:|
| **Mobile Phone Usage** | MediaPipe EfficientDet-Lite0 Object Detection | High ($\approx 94\%$ precision on sustained phone presence) |
| **Secondary Person / Impersonator** | Multi-face mesh & Person count tracking | High ($\approx 98\%$ precision) |
| **Tab Switching / Window Minimization** | Page Visibility API (`document.visibilityState`) | $100\%$ authoritative |
| **Window Resizing / Desktop Snapping** | Window resize & blur event listeners | $100\%$ authoritative |
| **Exam Window Exit** | Fullscreen API (`fullscreenchange`) | $100\%$ authoritative |
| **Verbal Assistance / Reading Aloud** | Web Audio Spectral VAD Speech-Band Filter | High (distinguishes speech from keyboard clatter) |
| **Offscreen Looking / Hidden Notes** | 3D Head Pose Yaw/Pitch/Roll & Iris Tracking | High on sustained gaze deviations $> 3.5\text{s}$ |
| **Answer Tampering & Race Conditions** | HMAC Server Clock validation + Local Outbox | $100\%$ authoritative |

---

## 2. Hard Technical Limitations of Standard Web Browsers

Modern web browsers (Chrome, Edge, Safari, Firefox) intentionally enforce security sandboxes to protect user operating systems. Because of these sandboxes, **pure web applications have fundamental limitations**:

### A. Global OS Shortcut Interception
* **Limitation:** Standard browsers cannot globally block OS-level hotkeys such as:
  - Windows: `Win + Tab`, `Alt + Tab`, `Win + Shift + S` (Snipping Tool), `Ctrl + Alt + Del`
  - macOS: `Cmd + Tab`, `Cmd + Option + Esc`, `Cmd + Shift + 4`
* **Mitigation:** When a candidate uses these shortcuts, the browser window immediately loses focus (`WINDOW_BLUR`) or switches away (`TAB_HIDDEN`). While the OS hotkey cannot be prevented from opening, the event is immediately captured, logged, and incurs a warning strike.

### B. Hardware Multi-Monitor Isolation
* **Limitation:** Standard web browsers cannot physically disable secondary monitors plugged into HDMI/DisplayPort without native OS device drivers.
* **Mitigation:** The candidate's webcam monitors eye gaze. If a student turns their head to look at a secondary display outside the webcam's primary cone for $> 3.5\text{ seconds}$, `PROLONGED_OFFSCREEN_GAZE` is emitted.

### C. Virtual Machines & Video Capture Cards
* **Limitation:** A candidate running an exam inside a VMware or VirtualBox instance cannot be distinguished from a bare-metal OS via JavaScript standard APIs. Similarly, an external HDMI splitter/capture card mirroring video to another machine cannot be detected via Web APIs.
* **Mitigation:** MediaPipe face, gaze, and phone detection operate on the user's physical camera feed, detecting the user's physical surroundings regardless of VM virtualization.

---

## 3. High-Stakes Institutional Roadmap: Safe Exam Browser (SEB)

For high-stakes summative exams (such as Bar Examinations, Medical Board Certifications, and University Final Semester Exams), AI ExamGuard offers integration with **Safe Exam Browser (SEB)** and native lock-down agents:

1. **Browser Exam Key (BEK) Verification:**
   - AI ExamGuard can enforce a custom HTTP header (`X-SafeExamBrowser-RequestHash`) verified by server-side HMAC against the institutional exam key.
   - Any attempt to access the exam from a standard Chrome/Edge browser is rejected with HTTP 403 Forbidden.
2. **Kiosk Mode Execution:**
   - SEB locks the computer into a full kiosk mode: disables task manager, disables dual monitors, prevents application launching, and kills unauthorized background processes (Discord, Zoom, TeamViewer).
3. **Hybrid Architecture:**
   - AI ExamGuard combines SEB's operating system lock-down with our browser-based MediaPipe AI computer vision for comprehensive physical and digital integrity.
