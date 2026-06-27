use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ─── Enums ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LayerType {
    Text,
    Shape,
    Image,
    Video,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum Easing {
    Linear,
    EaseIn,
    EaseOut,
    EaseInOut,
}

// ─── Datenmodell ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyframe {
    pub id: String,
    pub time: f64,
    pub properties: serde_json::Value, // JSON-Properties (number | string | boolean)
    pub easing: Easing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub id: String,
    #[serde(rename = "type")]
    pub layer_type: LayerType,
    pub name: String,
    pub visible: bool,
    pub locked: bool,
    pub color: String,
    pub start_frame: f64,
    pub end_frame: f64,
    pub keyframes: Vec<Keyframe>,
    pub properties: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub total_frames: u32,
    pub layers: Vec<Layer>,
    pub current_frame: u32,
}

// ─── Output-Typen (Frame-Berechnung) ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerFrameState {
    pub layer_id: String,
    pub layer_type: LayerType,
    pub name: String,
    pub visible: bool,
    pub color: String,
    pub computed_properties: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameState {
    pub time: f64,
    pub layers: Vec<LayerFrameState>,
}

// ─── Mock-Projekt ─────────────────────────────────────────────────────────────

pub fn create_mock_project() -> Project {
    Project {
        id: "proj-001".to_string(),
        name: "Intro-Animation".to_string(),
        width: 1920,
        height: 1080,
        fps: 30,
        total_frames: 120,
        current_frame: 0,
        layers: vec![
            Layer {
                id: "layer-1".to_string(),
                layer_type: LayerType::Text,
                name: "Titel".to_string(),
                visible: true,
                locked: false,
                color: "#3b82f6".to_string(),
                start_frame: 0.0,
                end_frame: 90.0,
                keyframes: vec![
                    Keyframe {
                        id: "kf-1a".to_string(),
                        time: 0.0,
                        properties: serde_json::json!({"opacity": 0, "x": 200, "y": 100}),
                        easing: Easing::EaseOut,
                    },
                    Keyframe {
                        id: "kf-1b".to_string(),
                        time: 30.0,
                        properties: serde_json::json!({"opacity": 100, "x": 200, "y": 100}),
                        easing: Easing::Linear,
                    },
                    Keyframe {
                        id: "kf-1c".to_string(),
                        time: 90.0,
                        properties: serde_json::json!({"opacity": 100, "x": 600, "y": 100}),
                        easing: Easing::EaseIn,
                    },
                ],
                properties: serde_json::json!({
                    "text": "LuwiMotion", "fontSize": 48, "color": "#ffffff",
                    "opacity": 100, "x": 200, "y": 100
                }),
            },
            Layer {
                id: "layer-2".to_string(),
                layer_type: LayerType::Shape,
                name: "Hintergrund-Form".to_string(),
                visible: true,
                locked: false,
                color: "#22c55e".to_string(),
                start_frame: 0.0,
                end_frame: 120.0,
                keyframes: vec![
                    Keyframe {
                        id: "kf-2a".to_string(),
                        time: 0.0,
                        properties: serde_json::json!({"scale": 0, "opacity": 0}),
                        easing: Easing::EaseOut,
                    },
                    Keyframe {
                        id: "kf-2b".to_string(),
                        time: 20.0,
                        properties: serde_json::json!({"scale": 100, "opacity": 80}),
                        easing: Easing::Linear,
                    },
                ],
                properties: serde_json::json!({
                    "shape": "rectangle", "width": 400, "height": 300,
                    "fill": "#22c55e", "opacity": 80, "scale": 100
                }),
            },
            Layer {
                id: "layer-3".to_string(),
                layer_type: LayerType::Image,
                name: "Logo-Asset".to_string(),
                visible: true,
                locked: true,
                color: "#f97316".to_string(),
                start_frame: 10.0,
                end_frame: 100.0,
                keyframes: vec![
                    Keyframe {
                        id: "kf-3a".to_string(),
                        time: 10.0,
                        properties: serde_json::json!({"opacity": 0, "rotation": -15}),
                        easing: Easing::EaseInOut,
                    },
                    Keyframe {
                        id: "kf-3b".to_string(),
                        time: 30.0,
                        properties: serde_json::json!({"opacity": 100, "rotation": 0}),
                        easing: Easing::Linear,
                    },
                    Keyframe {
                        id: "kf-3c".to_string(),
                        time: 60.0,
                        properties: serde_json::json!({"opacity": 100, "rotation": 5}),
                        easing: Easing::EaseIn,
                    },
                    Keyframe {
                        id: "kf-3d".to_string(),
                        time: 100.0,
                        properties: serde_json::json!({"opacity": 0, "rotation": 15}),
                        easing: Easing::EaseIn,
                    },
                ],
                properties: serde_json::json!({
                    "src": "/logo.png", "width": 120, "height": 120,
                    "opacity": 100, "rotation": 0
                }),
            },
            Layer {
                id: "layer-4".to_string(),
                layer_type: LayerType::Video,
                name: "Hintergrund-Video".to_string(),
                visible: false,
                locked: false,
                color: "#a855f7".to_string(),
                start_frame: 0.0,
                end_frame: 120.0,
                keyframes: vec![
                    Keyframe {
                        id: "kf-4a".to_string(),
                        time: 0.0,
                        properties: serde_json::json!({"opacity": 50}),
                        easing: Easing::Linear,
                    },
                ],
                properties: serde_json::json!({"src": "/bg.mp4", "opacity": 50}),
            },
        ],
    }
}
