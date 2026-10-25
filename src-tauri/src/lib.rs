mod background;
mod background_eval;
mod background_files;

#[cfg(target_os = "windows")]
mod tray;

use tauri::Manager;

#[cfg(target_os = "windows")]
#[derive(Clone, Copy)]
struct TrayAvailability {
  available: bool,
}

#[tauri::command]
fn resolve_windows_close(app: tauri::AppHandle, behavior: String) -> Result<(), String> {
  match behavior.as_str() {
    "tray" => {
      #[cfg(target_os = "windows")]
      if !app.state::<TrayAvailability>().available {
        return Err("tray is not available".to_string());
      }
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
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      #[cfg(target_os = "windows")]
      {
        let available = match tray::create(app.handle()) {
          Ok(()) => true,
          Err(error) => {
            eprintln!("failed to create the tray icon: {error}");
            false
          }
        };
        app.manage(TrayAvailability { available });
        background::spawn_timer(app.handle().clone());
      }
      #[cfg(not(target_os = "windows"))]
      let _ = app;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      resolve_windows_close,
      background::write_background_snapshot,
      background::read_background_events,
      background::clear_background_events
    ])
    .on_window_event(|window, event| {
      #[cfg(target_os = "windows")]
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let tray_available = window.app_handle().state::<TrayAvailability>().available;
        match tray::close_decision(
          tray::read_snapshot(window.app_handle()).as_deref(),
          tray_available,
        ) {
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
      #[cfg(not(target_os = "windows"))]
      let _ = (window, event);
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
