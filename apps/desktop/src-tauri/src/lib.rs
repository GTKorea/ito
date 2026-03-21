use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
      // When a second instance is launched (e.g. via deep link on Linux/Windows),
      // focus the existing window and forward the deep link URL.
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
      }
      // argv may contain the deep link URL on Linux/Windows
      for arg in &argv {
        if arg.starts_with("ito://") {
          let _ = app.emit("deep-link-received", arg.clone());
        }
      }
    }))
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // Handle deep link URL if the app was launched via deep link (cold start)
      if let Ok(Some(urls)) = app.deep_link().get_current() {
        for url in urls {
          let _ = app.emit("deep-link-received", url.to_string());
        }
      }

      // Handle deep link URLs received while the app is running (macOS)
      let handle = app.handle().clone();
      app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
          let _ = handle.emit("deep-link-received", url.to_string());
        }
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
