use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Einzelne Aktion im Plan (wird 1:1 an Frontend weitergegeben)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiAction {
    #[serde(rename = "type")]
    pub action_type: String,
    #[serde(rename = "targetLayerId")]
    pub target_layer_id: Option<String>,
    pub payload: Value,
}

/// Einzelner Schritt im Plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiStep {
    pub description: String,
    pub action: GeminiAction,
}

/// Gesamte Plan-Antwort der KI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiPlanResponse {
    pub message: String,
    pub steps: Vec<GeminiStep>,
}

// ─── Gemini API Response Strukturen ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct GeminiApiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiContent,
}

#[derive(Debug, Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Deserialize)]
struct GeminiPart {
    text: String,
}

// ─── System-Prompt ───────────────────────────────────────────────────────────

fn build_system_prompt(context_json: &str) -> String {
    format!(
        r#"Du bist der KI-Assistent von LuwiMotion, einem Motion-Graphics-Editor.

Der Nutzer beschreibt Animationen in natürlicher Sprache. Du erstellst daraus einen strukturierten Ausführungsplan.

## Projekt-Kontext
{context_json}

## Verfügbare Aktionstypen

### add_keyframe
Fügt einen Keyframe zu einem Layer hinzu.
- targetLayerId: ID des Ziel-Layers (Pflicht)
- payload: Objekt mit:
  - time: Frame-Nummer (number, Pflicht)
  - easing: "linear" | "ease-in" | "ease-out" | "ease-in-out"
  - Animations-Properties (number): opacity (0-100), x, y, scale (100 = normal), rotation (Grad)

### create_layer
Erstellt einen neuen Layer.
- payload: {{ type: "text"|"shape"|"image"|"video", name: string, startFrame: number, endFrame: number }}

### modify_layer
Ändert Layer-Properties.
- targetLayerId: ID des Ziel-Layers
- payload: Properties die geändert werden sollen

## Wichtige Regeln

1. Verwende NUR Layer-IDs die im Projekt-Kontext existieren
2. Wähle den ersten sichtbaren, nicht-gesperrten Layer wenn kein Layer spezifiziert wird
3. "einfliegen von links" → Start bei x=-200, Ziel bei x aus Layer-Properties, easing: ease-out
4. "einfliegen von rechts" → Start bei x=2120, Ziel bei x aus Layer-Properties, easing: ease-out
5. "einblenden" / "fade in" → opacity 0 → 100
6. "ausblenden" / "fade out" → opacity 100 → 0
7. "pulsieren" → 3 Schritte: scale 100 → 110 → 100, easing: ease-in-out
8. Wenn der Nutzer "bei Frame X" sagt, nutze Frame X als Zeitangabe
9. Standard FPS ist im Projekt-Kontext angegeben
10. Jede Beschreibung sollte kurz und menschenlesbar sein

## Antwort-Format (striktes JSON, keine Markdown-Blöcke)

{{
  "message": "Kurze Einleitung an den Nutzer",
  "steps": [
    {{
      "description": "Menschenlesbare Beschreibung des Schritts",
      "action": {{
        "type": "add_keyframe",
        "targetLayerId": "layer-1",
        "payload": {{ "time": 0, "opacity": 0, "x": -200, "easing": "linear" }}
      }}
    }}
  ]
}}

Antworte AUSSCHLIESSLICH mit gültigem JSON. Keine Erklärungen außerhalb des JSON."#
    )
}

// ─── Hauptfunktion ───────────────────────────────────────────────────────────

/// Ruft die Gemini 3.5 Flash API auf und generiert einen Animationsplan.
pub async fn generate_plan(
    prompt: &str,
    context_json: &str,
    api_key: &str,
) -> Result<GeminiPlanResponse, String> {
    let client = Client::builder()
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    let system_prompt = build_system_prompt(context_json);

    let body = serde_json::json!({
        "contents": [{
            "parts": [{ "text": prompt }]
        }],
        "systemInstruction": {
            "parts": [{ "text": system_prompt }]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4
        }
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={}",
        api_key
    );

    println!("[LuwiMotion AI] Sende Anfrage an Gemini 3.5 Flash...");

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Netzwerkfehler bei Gemini-API: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unbekannter Fehler".to_string());
        return Err(format!("Gemini API Fehler (HTTP {}): {}", status, error_text));
    }

    let api_response: GeminiApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Fehler beim Parsen der Gemini-Antwort: {}", e))?;

    let candidate = api_response
        .candidates
        .and_then(|c| c.into_iter().next())
        .ok_or_else(|| "Keine Antwort von Gemini erhalten (keine Candidates)".to_string())?;

    let part = candidate
        .content
        .parts
        .into_iter()
        .next()
        .ok_or_else(|| "Leere Antwort von Gemini (keine Parts)".to_string())?;

    let text = part.text.trim();

    // Eventuelle Markdown-Codeblöcke entfernen (```json ... ```)
    let clean_text = text
        .strip_prefix("```json")
        .and_then(|t| t.strip_suffix("```"))
        .unwrap_or(text)
        .trim();

    let plan: GeminiPlanResponse = serde_json::from_str(clean_text).map_err(|e| {
        format!(
            "Fehler beim Parsen des KI-Plans: {}\nRohe Antwort: {}",
            e, clean_text
        )
    })?;

    println!(
        "[LuwiMotion AI] Plan erhalten: {} Schritte",
        plan.steps.len()
    );

    Ok(plan)
}
