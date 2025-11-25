use std::collections::HashMap;
use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::{fs, thread};
use std::time::Duration;

use tauri::{path::BaseDirectory, Manager};

struct ServerState(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ServerState(Mutex::new(None)))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      start_bundled_server(app)?;
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if matches!(event, tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }) {
        let child = {
          let state = app_handle.state::<ServerState>();
          state
            .0
            .lock()
            .ok()
            .and_then(|mut guard| guard.take())
        };
        if let Some(mut child) = child {
          let _ = child.kill();
        }
      }
    });
}

fn start_bundled_server(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  // Use compile-time embedded value (set via build script)
  // Fall back to environment variable or default
  let instance: String = option_env!("TAURI_APP_INSTANCE")
    .map(|s| s.to_string())
    .unwrap_or_else(|| {
      std::env::var("TAURI_APP_INSTANCE").unwrap_or_else(|_| "student".to_string())
    });
  let resolver = app.handle().path();

  let node_path = resolver
    .resolve("resources/node/node.exe", BaseDirectory::Resource)
    .map_err(|_| "Failed to locate bundled Node runtime")?;

  let app_dir = resolver
    .resolve(format!("resources/app/{instance}"), BaseDirectory::Resource)
    .map_err(|_| "Failed to locate bundled Next.js build")?;

  let env_map = load_runtime_env(&app_dir)?;
  let port = load_port(&app_dir);

  let child = Command::new(node_path)
    .current_dir(&app_dir)
    .env("NODE_ENV", "production")
    .env("PORT", &port)
    .env("HOSTNAME", "127.0.0.1")
    .env("NEXT_TELEMETRY_DISABLED", "1")
    .envs(env_map.iter())
    .arg("server.js")
    .spawn()
    .map_err(|err| format!("Unable to start bundled server: {err}"))?;

  app
    .state::<ServerState>()
    .0
    .lock()
    .expect("server mutex poisoned")
    .replace(child);

  // Determine default port based on instance (student: 1420, admin: 1421)
  let default_port = if instance == "admin" { 1421 } else { 1420 };
  let port_number = port.parse::<u16>().unwrap_or(default_port);
  let handle_for_thread = app.handle().clone();
  thread::spawn(move || {
    for _ in 0..60 {
      if TcpStream::connect(("127.0.0.1", port_number)).is_ok() {
        if let Some(window) = handle_for_thread.get_webview_window("main") {
          let _ = window.eval(&format!("window.location.replace('http://127.0.0.1:{port_number}');"));
        }
        return;
      }
      thread::sleep(Duration::from_millis(500));
    }
  });

  Ok(())
}

fn load_runtime_env(app_dir: &std::path::Path) -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
  let env_file = app_dir.join("env.runtime.json");
  if env_file.exists() {
    let contents = fs::read_to_string(env_file)?;
    let mut map: HashMap<String, String> = serde_json::from_str(&contents)?;
    // Use the same instance determination logic as start_bundled_server
    let instance: String = option_env!("TAURI_APP_INSTANCE")
      .map(|s| s.to_string())
      .unwrap_or_else(|| {
        std::env::var("TAURI_APP_INSTANCE").unwrap_or_else(|_| "student".to_string())
      });
    map.insert("NEXT_PUBLIC_APP_INSTANCE".into(), instance.into());
    Ok(map)
  } else {
    Ok(HashMap::new())
  }
}

fn load_port(app_dir: &std::path::Path) -> String {
  let port_file = app_dir.join("server-port.txt");
  // Use different default ports based on instance (student: 1420, admin: 1421)
  let default_port = if option_env!("TAURI_APP_INSTANCE")
    .map(|s| s == "admin")
    .unwrap_or(false)
  {
    "1421"
  } else {
    "1420"
  };
  fs::read_to_string(port_file)
    .unwrap_or_else(|_| default_port.into())
    .trim()
    .to_string()
}
