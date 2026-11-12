# AI ExamGuard — Gaze Estimation & Head Movement Calibration

This document details the mathematical formulation, pre-flight calibration workflow, and temporal filtering algorithms used for eye gaze and head movement tracking.

---

## 1. 3D Pose Geometry & Coordinate System

Using 478 MediaPipe 3D landmarks, head orientation is modeled in Euler angles:

1. **Yaw ($\psi$):** Horizontal rotation (turning left or right).
   $$\psi = \arctan2(z_{nose} - z_{ear\_mid}, x_{nose} - x_{ear\_mid})$$
   Evaluated between landmark 1 (nose tip) and the horizontal midpoint between landmarks 33 and 263.
2. **Pitch ($\theta$):** Vertical tilt (looking up or down).
   $$\theta = \arctan2(y_{chin} - y_{forehead}, z_{chin} - z_{forehead})$$
   Calculated between landmark 10 (forehead top) and landmark 152 (chin bottom).
3. **Roll ($\phi$):** In-plane tilt (head tilted towards left/right shoulder).
   $$\phi = \arctan2(y_{right\_eye} - y_{left\_eye}, x_{right\_eye} - x_{left\_eye})$$

---

## 2. Interactive Pre-Flight Calibration

Every student completes an interactive gaze calibration before entering an examination:
1. Candidate fixes gaze on a pulsating target crosshair placed at screen center.
2. The engine records 25 baseline frames ($n = 25$).
3. The system calculates individual mean neutral vectors: $\mu_{\psi}, \mu_{\theta}, \mu_{\phi}$.
4. Statistical variance $\sigma^2_{\psi}$ verifies calibration stability.
5. Personalized bounds are computed:
   - $\text{Max Left Yaw} = \mu_{\psi} - 22.0^\circ$
   - $\text{Max Right Yaw} = \mu_{\psi} + 22.0^\circ$
   - $\text{Max Downward Pitch} = \mu_{\theta} - 24.0^\circ$

---

## 3. Natural Human Behavior Exemption Rules

- **Blinking:** Natural eye blinks ($100\text{ms} - 300\text{ms}$) are completely ignored by the temporal filter.
- **Reading Long Text:** Looking down at examination options is accounted for by generous vertical tolerance ($\mu_{\theta} - 24.0^\circ$).
- **Single Glance:** Briefly glancing away ($< 3.5\text{s}$) does NOT trigger an alert.
- **Sustained Deviation:** Only continuous gaze diverted outside the calibrated tolerance cone for $\ge 3.5\text{ seconds}$ raises `PROLONGED_OFFSCREEN_GAZE`.

