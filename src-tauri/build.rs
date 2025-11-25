fn main() {
  // Embed TAURI_APP_INSTANCE at compile time so the binary knows which app it is
  if let Ok(instance) = std::env::var("TAURI_APP_INSTANCE") {
    println!("cargo:rustc-env=TAURI_APP_INSTANCE={}", instance);
  }
  tauri_build::build()
}
