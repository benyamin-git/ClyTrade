#[cfg(desktop)]
mod tray;

use tauri::Manager;

#[tauri::command]
fn resolve_windows_close(app: tauri::AppHandle, behavior: String) -> Result<(), String> {
  match behavior.as_str() {
    "tray" => {
      let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is not available".to_string())?;
      window.hide().map_err(|error| error.to_string())
    }
    "quit" => {
      app.exit(0);
      Ok(())
    }
    other => Err(format!("invalid windows close behavior: {other}")),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      #[cfg(desktop)]
      tray::create(app.handle())?;
      #[cfg(not(desktop))]
      let _ = app;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![resolve_windows_close])
    .on_window_event(|window, event| {
      #[cfg(desktop)]
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        match tray::close_decision(tray::read_snapshot(window.app_handle()).as_deref()) {
          tray::CloseDecision::Allow => {}
          tray::CloseDecision::HideToTray => {
            api.prevent_close();
            let _ = window.hide();
          }
          tray::CloseDecision::Prompt => {
            api.prevent_close();
            use tauri::Emitter;
            let _ = window.emit("windows-close-prompt", ());
          }
        }
      }
      #[cfg(not(desktop))]
      let _ = (window, event);
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
