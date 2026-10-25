use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

pub fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
  let parent = path
    .parent()
    .ok_or_else(|| "background file has no parent directory".to_string())?;
  std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  let file_name = path
    .file_name()
    .and_then(|name| name.to_str())
    .unwrap_or("background");
  let temp = parent.join(format!(
    ".{file_name}.{}.{}.tmp",
    std::process::id(),
    TEMP_COUNTER.fetch_add(1, Ordering::Relaxed)
  ));
  if let Err(error) = std::fs::write(&temp, bytes) {
    let _ = std::fs::remove_file(&temp);
    return Err(error.to_string());
  }
  std::fs::rename(&temp, path).map_err(|error| {
    let _ = std::fs::remove_file(&temp);
    error.to_string()
  })
}

pub fn read_events_file(path: &Path) -> String {
  let Ok(raw) = std::fs::read_to_string(path) else {
    return "[]".to_string();
  };
  match serde_json::from_str::<serde_json::Value>(&raw) {
    Ok(serde_json::Value::Array(_)) => raw,
    _ => "[]".to_string(),
  }
}

pub fn clear_events_file(path: &Path) -> Result<(), String> {
  match std::fs::remove_file(path) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(error.to_string()),
  }
}
