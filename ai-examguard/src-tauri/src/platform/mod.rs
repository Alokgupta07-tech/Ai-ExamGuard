pub mod windows;
pub mod macos;
pub mod linux;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformAttestationReport {
    pub platform: String,
    pub client_version: String,
    pub os_release: String,
    pub kiosk_enforced: boolean_flag(),
    pub secondary_displays_detected: u32,
    pub virtual_machine_detected: bool,
    pub blacklisted_processes_found: Vec<String>,
    pub integrity_hash: String,
}

fn boolean_flag() -> bool {
    true
}

pub trait PlatformLockdownAdapter {
    fn initialize_lockdown(&mut self) -> Result<(), String>;
    fn release_lockdown(&mut self) -> Result<(), String>;
    fn query_attestation(&self) -> Result<PlatformAttestationReport, String>;
    fn detect_secondary_monitors(&self) -> u32;
    fn scan_prohibited_processes(&self) -> Vec<String>;
}

