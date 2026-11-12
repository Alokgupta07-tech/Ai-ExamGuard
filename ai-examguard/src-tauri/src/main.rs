// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod platform;

use platform::{
    PlatformAttestationReport,
    PlatformLockdownAdapter,
    windows::WindowsLockdownAdapter,
    macos::MacOsLockdownAdapter,
    linux::LinuxLockdownAdapter,
};

#[tauri::command]
fn get_security_attestation() -> Result<PlatformAttestationReport, String> {
    #[cfg(target_os = "windows")]
    {
        let adapter = WindowsLockdownAdapter::new();
        adapter.query_attestation()
    }

    #[cfg(target_os = "macos")]
    {
        let adapter = MacOsLockdownAdapter::new();
        adapter.query_attestation()
    }

    #[cfg(target_os = "linux")]
    {
        let adapter = LinuxLockdownAdapter::new();
        adapter.query_attestation()
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system for native desktop lockdown.".to_string())
    }
}

#[tauri::command]
fn engage_desktop_lockdown() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let mut adapter = WindowsLockdownAdapter::new();
        adapter.initialize_lockdown()?;
        Ok(true)
    }

    #[cfg(target_os = "macos")]
    {
        let mut adapter = MacOsLockdownAdapter::new();
        adapter.initialize_lockdown()?;
        Ok(true)
    }

    #[cfg(target_os = "linux")]
    {
        let mut adapter = LinuxLockdownAdapter::new();
        adapter.initialize_lockdown()?;
        Ok(true)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system.".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_security_attestation,
            engage_desktop_lockdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AI ExamGuard Secure Client");
}

