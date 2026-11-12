# AI ExamGuard — Audio Intelligence & Voice Activity Detection (VAD)

This document specifies the acoustic processing pipeline, speech-band discrimination algorithms, noise suppression rules, and privacy protections.

---

## 1. Acoustic Processing Pipeline

```
Microphone Audio Input (PCM 16 kHz Float32)
       │
       ▼
Browser Noise Suppression & Echo Cancellation (Constraint Level)
       │
       ▼
Short-Window RMS Energy Computation (100 ms Sliding Window)
       │
       ▼
FFT Spectral Energy Distribution Analysis (0 Hz – 8 kHz)
       │
       ▼
Speech Band Energy Concentration Ratio (300 Hz – 3,400 Hz)
       │
       ▼
Temporal Filter & Cooldown Engine
       │
       ▼
Event Classification: AUDIO_ACTIVITY vs SUSTAINED_SPEECH_ACTIVITY
```

---

## 2. Speech vs. Ambient Noise Discrimination

A critical flaw in basic proctoring software is flagging keystrokes, air conditioning, or passing trucks as cheating:
- **Broad-Spectrum Noise:** Keystrokes, fans, coughing, and street traffic distribute acoustic energy across high and low frequencies without speech formant structure. These emit low-severity `AUDIO_ACTIVITY` informational notices that **never** count as policy strikes.
- **Sustained Vocal Speech:** Human speech concentrates over $58\%$ of total acoustic energy in the vocal formant band ($300\text{ Hz}$ to $3,400\text{ Hz}$). When sustained for $> 2.5\text{ seconds}$, `SUSTAINED_SPEECH_ACTIVITY` is emitted.

---

## 3. Privacy Guarantees

1. **No Raw Audio Stored:** Microphone samples are analyzed in volatile memory and immediately overwritten. No audio recording files are ever saved on disk or server databases.
2. **No Speaker Identification:** The system evaluates acoustic presence only; it does not perform voice recognition or transcription.
3. **Student Microphone Indicator:** The candidate examination workspace displays a real-time microphone active pill.

