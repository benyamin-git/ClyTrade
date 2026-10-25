use serde::Deserialize;
use tauri::{
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  AppHandle, Manager,
};

const SNAPSHOT_FILE: &str = "background-snapshot.json";

#[derive(Debug, PartialEq, Eq)]
pub enum CloseDecision {
  Allow,
  HideToTray,
  Prompt,
}

#[derive(Deserialize)]
struct Snapshot {
  #[serde(rename = "backgroundMonitoring", default)]
  background_monitoring: bool,
  #[serde(rename = "windowsCloseBehavior", default)]
  windows_close_behavior: String,
}

pub fn read_snapshot(app: &AppHandle) -> Option<String> {
  let path = app.path().app_data_dir().ok()?.join(SNAPSHOT_FILE);
  std::fs::read_to_string(path).ok()
}

pub fn close_decision(snapshot: Option<&str>, tray_available: bool) -> CloseDecision {
  if !tray_available {
    return CloseDecision::Allow;
  }
  let Some(json) = snapshot else {
    return CloseDecision::Allow;
  };
  let Ok(snapshot) = serde_json::from_str::<Snapshot>(json) else {
    return CloseDecision::Allow;
  };
  if !snapshot.background_monitoring {
    return CloseDecision::Allow;
  }
  match snapshot.windows_close_behavior.as_str() {
    "tray" => CloseDecision::HideToTray,
    "quit" => CloseDecision::Allow,
    _ => CloseDecision::Prompt,
  }
}

pub fn show_main(app: &AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
  let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
  let menu = Menu::with_items(app, &[&show, &quit])?;

  let mut builder = TrayIconBuilder::with_id("main")
    .menu(&menu)
    .on_menu_event(|app, event| match event.id.as_ref() {
      "show" => show_main(app),
      "quit" => app.exit(0),
      _ => {}
    });

  if let Some(icon) = app.default_window_icon() {
    builder = builder.icon(icon.clone());
  }

  builder.build(app)?;
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::{close_decision, CloseDecision};

  #[test]
  fn missing_snapshot_allows_close() {
    assert_eq!(close_decision(None, true), CloseDecision::Allow);
  }

  #[test]
  fn invalid_or_empty_snapshot_allows_close() {
    assert_eq!(close_decision(Some("not json"), true), CloseDecision::Allow);
    assert_eq!(close_decision(Some("{}"), true), CloseDecision::Allow);
  }

  #[test]
  fn unavailable_tray_allows_close() {
    assert_eq!(
      close_decision(
        Some(r#"{"backgroundMonitoring":true,"windowsCloseBehavior":"tray"}"#),
        false
      ),
      CloseDecision::Allow
    );
  }

  #[test]
  fn monitoring_off_allows_close() {
    assert_eq!(
      close_decision(
        Some(r#"{"backgroundMonitoring":false,"windowsCloseBehavior":"tray"}"#),
        true
      ),
      CloseDecision::Allow
    );
  }

  #[test]
  fn tray_hides_the_window() {
    assert_eq!(
      close_decision(
        Some(r#"{"backgroundMonitoring":true,"windowsCloseBehavior":"tray"}"#),
        true
      ),
      CloseDecision::HideToTray
    );
  }

  #[test]
  fn quit_allows_the_close() {
    assert_eq!(
      close_decision(
        Some(r#"{"backgroundMonitoring":true,"windowsCloseBehavior":"quit"}"#),
        true
      ),
      CloseDecision::Allow
    );
  }

  #[test]
  fn unset_or_unknown_prompts() {
    assert_eq!(
      close_decision(
        Some(r#"{"backgroundMonitoring":true,"windowsCloseBehavior":"unset"}"#),
        true
      ),
      CloseDecision::Prompt
    );
    assert_eq!(
      close_decision(
        Some(r#"{"backgroundMonitoring":true,"windowsCloseBehavior":"other"}"#),
        true
      ),
      CloseDecision::Prompt
    );
  }
}
