import type { ProjectContext, AiResponse, AiBackend, AgentPlan, AgentStep, AgentStepAction } from '../types/project';

// ─── System-Prompt für Gemini ────────────────────────────────────────────────

function buildSystemPrompt(context: ProjectContext): string {
  const layerInfo = context.layers
    .map((l) => `  - id: "${l.id}", name: "${l.name}", type: ${l.type}, visible: ${l.visible}, locked: ${l.locked}, properties: ${JSON.stringify(l.properties)}`)
    .join('\n');

  return `Du bist der KI-Assistent von LuwiMotion, einem Motion-Graphics-Editor.

Der Nutzer beschreibt Animationen in natürlicher Sprache. Du erstellst daraus einen strukturierten Ausführungsplan.

## Projekt-Kontext
- FPS: ${context.fps}
- Total Frames: ${context.totalFrames}
- Current Frame: ${context.currentFrame}

## Verfügbare Layer
${layerInfo}

## Verfügbare Aktionstypen

### add_keyframe
Fügt einen Keyframe zu einem Layer hinzu.
- targetLayerId: ID des Ziel-Layers (Pflicht)
- payload: Objekt mit:
  - time: Frame-Nummer (number, Pflicht)
  - easing: "linear" | "ease-in" | "ease-out" | "ease-in-out"
  - Animations-Properties (number): opacity (0-100), x (Pixel), y (Pixel), scale (100 = normal), rotation (Grad), width (Pixel), height (Pixel), fontSize (Pixel)

### create_layer
Erstellt einen neuen Layer.
- payload: { type: "text"|"shape"|"image"|"video", name: string, startFrame: number, endFrame: number }
  Der Layer wird automatisch in der Canvas-Mitte platziert.

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
9. Jede Beschreibung sollte kurz und menschenlesbar sein

## Antwort-Format (striktes JSON, keine Markdown-Blöcke)
{
  "message": "Kurze Einleitung an den Nutzer",
  "steps": [
    {
      "description": "Menschenlesbare Beschreibung des Schritts",
      "action": {
        "type": "add_keyframe",
        "targetLayerId": "layer-1",
        "payload": { "time": 0, "opacity": 0, "x": -200, "easing": "linear" }
      }
    }
  ]
}

Antworte AUSSCHLIESSLICH mit gültigem JSON. Keine Erklärungen außerhalb des JSON.`;
}

// ─── Gemini API Direct Call ──────────────────────────────────────────────────

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

interface GeminiApiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

async function callGeminiApi(prompt: string, context: ProjectContext, apiKey: string): Promise<AiResponse> {
  const systemPrompt = buildSystemPrompt(context);

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  };

  console.log('[Gemini] Sende Anfrage an Gemini 3.5 Flash...');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Fehler (HTTP ${response.status}): ${errorText}`);
  }

  const data: GeminiApiResponse = await response.json();

  const rawText = data
    ?.candidates?.[0]
    ?.content?.parts?.[0]
    ?.text;

  if (!rawText) {
    throw new Error('Keine Antwort von Gemini erhalten.');
  }

  // Markdown-Codeblöcke entfernen falls vorhanden
  const cleanText = rawText
    .trim()
    .replace(/^```json\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  const parsed = JSON.parse(cleanText) as {
    message: string;
    steps: { description: string; action: AgentStepAction }[];
  };

  console.log(`[Gemini] Plan erhalten: ${parsed.steps?.length ?? 0} Schritte`);

  // Steps mit done: false initialisieren
  const steps: AgentStep[] = (parsed.steps || []).map((step, i) => ({
    id: `gemini-step-${i}-${Date.now().toString(36)}`,
    description: step.description,
    action: step.action,
    done: false,
  }));

  const plan: AgentPlan = { steps };

  return {
    message: parsed.message || '✦ Plan erstellt:',
    actions: [],
    plan,
  };
}

// ─── Gemini Backend (Direct + Tauri IPC Fallback) ────────────────────────────

export const geminiBackend: AiBackend = {
  async sendMessage(prompt: string, context: ProjectContext): Promise<AiResponse> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return {
        message: '✦ Kein Gemini API-Key konfiguriert.\n\nBitte NEXT_PUBLIC_GEMINI_API_KEY in .env.local setzen.\nKey erstellen: https://aistudio.google.com/apikey',
        actions: [],
      };
    }

    try {
      return await callGeminiApi(prompt, context, apiKey);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Gemini Backend] Fehler:', errorMsg);

      return {
        message: `✦ Fehler bei der KI-Verbindung:\n${errorMsg}`,
        actions: [],
      };
    }
  },
};
