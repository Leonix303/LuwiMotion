use std::sync::Mutex;
use tauri::State;
use crate::model::{FrameState, Keyframe, Layer, Project};
use crate::interpolation::compute_frame_state;
use crate::ai;

pub struct AppState {
    pub project: Mutex<Project>,
}

/// Gibt das komplette Projekt zurück.
#[tauri::command]
pub fn get_project(state: State<AppState>) -> Project {
    state.project.lock().unwrap().clone()
}

/// Berechnet den FrameState für einen gegebenen Zeitpunkt (in Frames).
#[tauri::command]
pub fn compute_frame(time: f64, state: State<AppState>) -> FrameState {
    let project = state.project.lock().unwrap();
    let result = compute_frame_state(&project, time);
    println!(
        "[LuwiMotion Engine] compute_frame(t={}) → {} sichtbare Layer",
        time,
        result.layers.len()
    );
    result
}

/// Fügt einen Keyframe zu einem Layer hinzu und gibt den aktualisierten Layer zurück.
#[tauri::command]
pub fn add_keyframe(layer_id: String, keyframe: Keyframe, state: State<AppState>) -> Result<Layer, String> {
    let mut project = state.project.lock().unwrap();
    let layer = project
        .layers
        .iter_mut()
        .find(|l| l.id == layer_id)
        .ok_or_else(|| format!("Layer '{}' nicht gefunden", layer_id))?;

    layer.keyframes.push(keyframe);
    layer.keyframes.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap());

    println!(
        "[LuwiMotion Engine] add_keyframe: Layer '{}' hat jetzt {} Keyframes",
        layer_id,
        layer.keyframes.len()
    );
    Ok(layer.clone())
}

/// Aktualisiert einen bestehenden Keyframe und gibt den aktualisierten Layer zurück.
#[tauri::command]
pub fn update_keyframe(layer_id: String, keyframe: Keyframe, state: State<AppState>) -> Result<Layer, String> {
    let mut project = state.project.lock().unwrap();
    let layer = project
        .layers
        .iter_mut()
        .find(|l| l.id == layer_id)
        .ok_or_else(|| format!("Layer '{}' nicht gefunden", layer_id))?;

    if let Some(kf) = layer.keyframes.iter_mut().find(|k| k.id == keyframe.id) {
        *kf = keyframe;
        layer.keyframes.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap());
        println!(
            "[LuwiMotion Engine] update_keyframe: Keyframe '{}' in Layer '{}' aktualisiert",
            kf.id, layer_id
        );
    } else {
        return Err(format!(
            "Keyframe '{}' nicht in Layer '{}' gefunden",
            keyframe.id, layer_id
        ));
    }

    Ok(layer.clone())
}

/// Löscht einen Keyframe anhand seiner ID und gibt den aktualisierten Layer zurück.
#[tauri::command]
pub fn delete_keyframe(layer_id: String, keyframe_id: String, state: State<AppState>) -> Result<Layer, String> {
    let mut project = state.project.lock().unwrap();
    let layer = project
        .layers
        .iter_mut()
        .find(|l| l.id == layer_id)
        .ok_or_else(|| format!("Layer '{}' nicht gefunden", layer_id))?;

    let before_count = layer.keyframes.len();
    layer.keyframes.retain(|k| k.id != keyframe_id);

    if layer.keyframes.len() == before_count {
        return Err(format!(
            "Keyframe '{}' nicht in Layer '{}' gefunden",
            keyframe_id, layer_id
        ));
    }

    println!(
        "[LuwiMotion Engine] delete_keyframe: Keyframe '{}' aus Layer '{}' entfernt",
        keyframe_id, layer_id
    );
    Ok(layer.clone())
}

/// KI-Chat: Sendet einen Prompt an Gemini 3.5 Flash und gibt einen Animationsplan zurueck.
#[tauri::command]
pub async fn ai_chat(prompt: String, context_json: String) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "GEMINI_API_KEY nicht gesetzt. Bitte in src-tauri/.env eintragen.".to_string())?;

    let plan = ai::generate_plan(&prompt, &context_json, &api_key).await?;

    serde_json::to_string(&plan)
        .map_err(|e| format!("Fehler beim Serialisieren der KI-Antwort: {}", e))
}
