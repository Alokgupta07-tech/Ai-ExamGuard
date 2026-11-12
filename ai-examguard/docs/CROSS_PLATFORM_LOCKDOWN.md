# AI ExamGuard — Cross-Platform Desktop Lockdown & Native Security

This document specifies the native desktop client architecture (Tauri 2 + Rust), OS platform lockdown adapters, Safe Exam Browser (SEB) integration, and transparent platform limitations.

---

## 1. Native Client Architecture (Tauri 2 + Rust)

The AI ExamGuard Secure Client is built with **Tauri 2 and Rust**, achieving a native memory footprint of $< 45\text{ MB}$ compared to $> 350\text{ MB}$ for Electron:
- **Core Rust Engine:** `src-tauri/src/main.rs`
- **Platform Adapters:** `src-tauri/src/platform/{windows, macos, linux}/mod.rs`
- **Hardware Integration:** Direct OS API calls for display enumeration, process listing, and low-level keyboard interception.

---

## 2. Platform Security Capability Matrix

| Capability | Windows (Win32 / Assigned Access) | macOS (Managed Assessment) | Linux (Lab Kiosk X11/Wayland) | Standard Web Browser |
|---|:---:|:---:|:---:|:---:|
| **Fullscreen Enforced** | ✅ Full | ✅ Full | ✅ Full | ⚠️ Soft (Fullscreen API) |
| **Alt+Tab / Cmd+Tab Blocked** | ✅ Low-Level Hook | ✅ Assessment Mode | ⚠️ X11 Grab / Compositor | ❌ Lost Focus Event Only |
| **Dual Monitor Detection** | ✅ EnumDisplayMonitors | ✅ NSScreen API | ✅ XRandR / Wayland | ❌ Approximate Window Pos |
| **Process Blacklisting (AnyDesk, Discord)** | ✅ Toolhelp32Snapshot | ✅ NSWorkspace | ✅ /proc inspection | ❌ Sandbox Prohibited |
| **Screen Capture Blocked** | ✅ SetWindowDisplayAffinity | ✅ Sharing Service Block | ⚠️ Kiosk compositor | ❌ OS Shortcut Uninterceptable |
| **Virtual Machine Detection** | ✅ CPUID / SMBIOS | ✅ IOKit Model Query | ✅ DMI Table Query | ❌ Prohibited |

---

## 3. Safe Exam Browser (SEB) Integration

For institutions with existing Safe Exam Browser deployments:
1. Administrators download a generated `.seb` configuration (`/api/exams/[examId]/seb-config`).
2. AI ExamGuard calculates the expected Browser Exam Key (BEK) via SHA-256 HMAC.
3. When candidates connect, the server validates the incoming `X-SafeExamBrowser-RequestHash` header.
4. Any attempt to access via Chrome, Edge, or Firefox is rejected with HTTP 403 Forbidden.

