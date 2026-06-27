use std::collections::HashMap;
use crate::model::{Easing, FrameState, Keyframe, Layer, LayerFrameState, LayerType, Project};

// ─── Easing-Funktionen ────────────────────────────────────────────────────────

/// Berechnet den eased Progress-Wert (0.0–1.0) basierend auf der Easing-Funktion.
fn apply_easing(t: f64, easing: &Easing) -> f64 {
    let t = t.clamp(0.0, 1.0);
    match easing {
        Easing::Linear => t,
        Easing::EaseIn => t * t,
        Easing::EaseOut => 1.0 - (1.0 - t) * (1.0 - t),
        Easing::EaseInOut => {
            if t < 0.5 {
                2.0 * t * t
            } else {
                1.0 - (-2.0 * t + 2.0).powi(2) / 2.0
            }
        }
    }
}

// ─── Interpolation ────────────────────────────────────────────────────────────

/// Lineare Interpolation zwischen zwei f64-Werten.
fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

/// Interpoliert alle numerischen Properties zwischen zwei Keyframes.
/// Nicht-numerische Properties werden vom ersten Keyframe übernommen.
fn interpolate_properties(from: &serde_json::Value, to: &serde_json::Value, t: f64) -> HashMap<String, f64> {
    let mut result = HashMap::new();

    if let (Some(from_obj), Some(to_obj)) = (from.as_object(), to.as_object()) {
        for (key, from_val) in from_obj {
            if let Some(from_f64) = from_val.as_f64() {
                let to_f64 = to_obj.get(key).and_then(|v| v.as_f64()).unwrap_or(from_f64);
                result.insert(key.clone(), lerp(from_f64, to_f64, t));
            }
        }
    }

    result
}

/// Findet die zwei Keyframes, die einen gegebenen Zeitpunkt umschließen.
/// Gibt (prev, next) zurück.
fn find_bounding_keyframes(keyframes: &[Keyframe], time: f64) -> Option<(&Keyframe, &Keyframe)> {
    if keyframes.is_empty() {
        return None;
    }

    // Vor dem ersten Keyframe
    if time <= keyframes[0].time {
        return Some((&keyframes[0], &keyframes[0]));
    }

    // Nach dem letzten Keyframe
    let last = keyframes.len() - 1;
    if time >= keyframes[last].time {
        return Some((&keyframes[last], &keyframes[last]));
    }

    // Finde das Keyframe-Paar
    for i in 0..last {
        if time >= keyframes[i].time && time <= keyframes[i + 1].time {
            return Some((&keyframes[i], &keyframes[i + 1]));
        }
    }

    None
}

/// Berechnet den interpolierten Zustand eines Layers zum gegebenen Zeitpunkt.
pub fn compute_layer_frame(layer: &Layer, time: f64) -> LayerFrameState {
    let computed_properties = if layer.keyframes.is_empty() {
        // Keine Keyframes: Basis-Properties extrahieren
        extract_numeric_properties(&layer.properties)
    } else {
        match find_bounding_keyframes(&layer.keyframes, time) {
            Some((prev, next)) => {
                if (prev.time - next.time).abs() < f64::EPSILON {
                    // Exakt auf einem Keyframe
                    extract_numeric_properties(&prev.properties)
                } else {
                    // Interpolation zwischen zwei Keyframes
                    let raw_t = (time - prev.time) / (next.time - prev.time);
                    let eased_t = apply_easing(raw_t, &prev.easing);
                    interpolate_properties(&prev.properties, &next.properties, eased_t)
                }
            }
            None => extract_numeric_properties(&layer.properties),
        }
    };

    LayerFrameState {
        layer_id: layer.id.clone(),
        layer_type: layer.layer_type.clone(),
        name: layer.name.clone(),
        visible: layer.visible,
        color: layer.color.clone(),
        computed_properties,
    }
}

/// Extrahiert alle numerischen (f64) Properties aus einem JSON-Value.
fn extract_numeric_properties(value: &serde_json::Value) -> HashMap<String, f64> {
    let mut result = HashMap::new();
    if let Some(obj) = value.as_object() {
        for (key, val) in obj {
            if let Some(f) = val.as_f64() {
                result.insert(key.clone(), f);
            }
        }
    }
    result
}

/// Berechnet den kompletten FrameState für alle Layer zum gegebenen Zeitpunkt.
pub fn compute_frame_state(project: &Project, time: f64) -> FrameState {
    let layers: Vec<LayerFrameState> = project
        .layers
        .iter()
        .filter(|l| l.visible)
        .map(|layer| compute_layer_frame(layer, time))
        .collect();

    FrameState { time, layers }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Easing, Keyframe};

    #[test]
    fn test_easing_linear() {
        assert!((apply_easing(0.0, &Easing::Linear) - 0.0).abs() < 1e-10);
        assert!((apply_easing(0.5, &Easing::Linear) - 0.5).abs() < 1e-10);
        assert!((apply_easing(1.0, &Easing::Linear) - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_easing_ease_in() {
        assert!((apply_easing(0.0, &Easing::EaseIn) - 0.0).abs() < 1e-10);
        assert!((apply_easing(0.5, &Easing::EaseIn) - 0.25).abs() < 1e-10);
        assert!((apply_easing(1.0, &Easing::EaseIn) - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_easing_ease_out() {
        assert!((apply_easing(0.0, &Easing::EaseOut) - 0.0).abs() < 1e-10);
        assert!((apply_easing(0.5, &Easing::EaseOut) - 0.75).abs() < 1e-10);
        assert!((apply_easing(1.0, &Easing::EaseOut) - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_easing_ease_in_out() {
        assert!((apply_easing(0.0, &Easing::EaseInOut) - 0.0).abs() < 1e-10);
        assert!((apply_easing(0.5, &Easing::EaseInOut) - 0.5).abs() < 1e-10);
        assert!((apply_easing(1.0, &Easing::EaseInOut) - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_lerp() {
        assert!((lerp(0.0, 100.0, 0.0) - 0.0).abs() < 1e-10);
        assert!((lerp(0.0, 100.0, 0.5) - 50.0).abs() < 1e-10);
        assert!((lerp(0.0, 100.0, 1.0) - 100.0).abs() < 1e-10);
        assert!((lerp(-10.0, 10.0, 0.5) - 0.0).abs() < 1e-10);
    }

    #[test]
    fn test_interpolate_properties() {
        let from = serde_json::json!({"opacity": 0, "x": 200});
        let to = serde_json::json!({"opacity": 100, "x": 600});
        let result = interpolate_properties(&from, &to, 0.5);
        assert!((result["opacity"] - 50.0).abs() < 1e-10);
        assert!((result["x"] - 400.0).abs() < 1e-10);
    }

    #[test]
    fn test_interpolate_with_non_numeric() {
        let from = serde_json::json!({"opacity": 0, "color": "#ff0000"});
        let to = serde_json::json!({"opacity": 100, "color": "#00ff00"});
        let result = interpolate_properties(&from, &to, 0.5);
        assert_eq!(result.len(), 1); // Nur opacity wird interpoliert
        assert!((result["opacity"] - 50.0).abs() < 1e-10);
    }

    #[test]
    fn test_find_bounding_keyframes_empty() {
        let keyframes: Vec<Keyframe> = vec![];
        assert!(find_bounding_keyframes(&keyframes, 5.0).is_none());
    }

    #[test]
    fn test_find_bounding_keyframes_before() {
        let keyframes = vec![
            Keyframe { id: "a".into(), time: 10.0, properties: serde_json::json!({}), easing: Easing::Linear },
        ];
        let (prev, next) = find_bounding_keyframes(&keyframes, 5.0).unwrap();
        assert_eq!(prev.time, 10.0);
        assert_eq!(next.time, 10.0);
    }

    #[test]
    fn test_find_bounding_keyframes_between() {
        let keyframes = vec![
            Keyframe { id: "a".into(), time: 0.0, properties: serde_json::json!({}), easing: Easing::Linear },
            Keyframe { id: "b".into(), time: 30.0, properties: serde_json::json!({}), easing: Easing::Linear },
            Keyframe { id: "c".into(), time: 60.0, properties: serde_json::json!({}), easing: Easing::Linear },
        ];
        let (prev, next) = find_bounding_keyframes(&keyframes, 15.0).unwrap();
        assert_eq!(prev.time, 0.0);
        assert_eq!(next.time, 30.0);
    }

    #[test]
    fn test_compute_layer_frame_at_keyframe() {
        let layer = Layer {
            id: "test".into(),
            layer_type: LayerType::Text,
            name: "Test".into(),
            visible: true,
            locked: false,
            color: "#fff".into(),
            start_frame: 0.0,
            end_frame: 60.0,
            keyframes: vec![
                Keyframe { id: "a".into(), time: 0.0, properties: serde_json::json!({"opacity": 0}), easing: Easing::Linear },
                Keyframe { id: "b".into(), time: 30.0, properties: serde_json::json!({"opacity": 100}), easing: Easing::Linear },
            ],
            properties: serde_json::json!({"opacity": 0}),
        };

        let state = compute_layer_frame(&layer, 0.0);
        assert!((state.computed_properties["opacity"] - 0.0).abs() < 1e-10);

        let state = compute_layer_frame(&layer, 15.0);
        assert!((state.computed_properties["opacity"] - 50.0).abs() < 1e-10);

        let state = compute_layer_frame(&layer, 30.0);
        assert!((state.computed_properties["opacity"] - 100.0).abs() < 1e-10);
    }

    #[test]
    fn test_compute_frame_state_filters_invisible() {
        let project = crate::model::create_mock_project();
        // layer-4 (Video) ist invisible
        let frame = compute_frame_state(&project, 0.0);
        assert!(!frame.layers.iter().any(|l| l.layer_id == "layer-4"));
    }

    #[test]
    fn test_compute_frame_state_mock_project() {
        let project = crate::model::create_mock_project();
        // Frame 15: Titel-Layer zwischen kf-1a (t=0, opacity=0) und kf-1b (t=30, opacity=100)
        // EaseOut bei t=0.5 → eased_t=0.75 → opacity=75
        let frame = compute_frame_state(&project, 15.0);
        let title_layer = frame.layers.iter().find(|l| l.layer_id == "layer-1").unwrap();
        assert!((title_layer.computed_properties["opacity"] - 75.0).abs() < 1e-10);
    }
}
