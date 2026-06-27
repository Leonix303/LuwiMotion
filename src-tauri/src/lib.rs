pub mod model;
pub mod interpolation;
pub mod commands;
pub mod ai;

use std::sync::Mutex;
use commands::{AppState, get_project, compute_frame, add_keyframe, update_keyframe, delete_keyframe, ai_chat};
use model::create_mock_project;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // .env-Datei laden (GEMINI_API_KEY etc.)
    dotenvy::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            project: Mutex::new(create_mock_project()),
        })
        .invoke_handler(tauri::generate_handler![
            get_project,
            compute_frame,
            add_keyframe,
            update_keyframe,
            delete_keyframe,
            ai_chat,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der LuwiMotion-App");
}
