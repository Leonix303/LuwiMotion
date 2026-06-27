import type { ProjectContext, AiResponse, AiBackend, AgentPlan, AgentStep, AgentStepAction } from '../types/project';

/**
 * KI-Backend Interface – exportiert aus types/project.ts.
 * Hier nur re-exportiert fuer Abwaertskompatibilitaet.
 */
export type { AiBackend };

let stepIdCounter = 0;
function genStepId(): string {
  return `step-${++stepIdCounter}-${Date.now().toString(36)}`;
}

function makeStep(description: string, action: AgentStepAction): AgentStep {
  return { id: genStepId(), description, action, done: false };
}

function findTargetLayer(context: ProjectContext) {
  return context.layers.find((l) => l.visible && !l.locked);
}

function parseFrameFromPrompt(prompt: string): number {
  const match = prompt.match(/(?:frame|bei|ab)\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 30;
}

function detectLayerType(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('text') || lower.includes('titel') || lower.includes('schrift')) return 'text';
  if (lower.includes('form') || lower.includes('shape') || lower.includes('rechteck') || lower.includes('kreis')) return 'shape';
  if (lower.includes('bild') || lower.includes('image') || lower.includes('foto')) return 'image';
  if (lower.includes('video') || lower.includes('clip')) return 'video';
  return 'shape';
}

/**
 * Erstellt einen AgentPlan aus dem Nutzer-Prompt.
 * Dies ist die zentrale Funktion, die später durch eine echte
 * Inference-Engine ersetzt wird.
 */
function generatePlan(prompt: string, context: ProjectContext): { message: string; plan: AgentPlan } | null {
  const lower = prompt.toLowerCase();
  const frame = parseFrameFromPrompt(prompt);
  const targetLayer = findTargetLayer(context);

  if (!targetLayer) {
    return {
      message: '✦ Kein bearbeitbarer Layer gefunden. Entsperre einen Layer, um Animationen hinzuzufügen.',
      plan: { steps: [] },
    };
  }

  const steps: AgentStep[] = [];

  // ── Bewegungs-/Einflug-Pattern ─────────────────────────────────────
  const isFlyIn = lower.includes('einflieg') || lower.includes('von links') || lower.includes('von rechts')
    || lower.includes('fliegt') || lower.includes('einschieb') || lower.includes('slide');
  const fromLeft = lower.includes('links') || lower.includes('left');

  if (isFlyIn || (lower.includes('beweg') || lower.includes('animation') || lower.includes('einblend') || lower.includes('ausblend') || lower.includes('fade'))) {
    // Start-Keyframe (außerhalb / transparent)
    if (isFlyIn || lower.includes('einblend') || lower.includes('fade in')) {
      const startX = fromLeft ? -200 : (lower.includes('rechts') ? 2120 : Number(targetLayer.properties.x) || 200);
      steps.push(makeStep(
        `Keyframe: "${targetLayer.name}" Startposition (x=${startX}, transparent) bei Frame 0`,
        {
          type: 'add_keyframe',
          targetLayerId: targetLayer.id,
          payload: { time: 0, opacity: 0, x: startX, easing: 'linear' },
        }
      ));
      // Ziel-Keyframe
      steps.push(makeStep(
        `Keyframe: "${targetLayer.name}" Zielposition (x=${targetLayer.properties.x ?? 200}) bei Frame ${frame}, Ease-Out`,
        {
          type: 'add_keyframe',
          targetLayerId: targetLayer.id,
          payload: { time: frame, opacity: 100, x: targetLayer.properties.x ?? 200, easing: 'ease-out' },
        }
      ));
    } else if (lower.includes('ausblend') || lower.includes('fade out')) {
      steps.push(makeStep(
        `Keyframe: "${targetLayer.name}" sichtbar bei Frame ${frame}`,
        {
          type: 'add_keyframe',
          targetLayerId: targetLayer.id,
          payload: { time: frame, opacity: 100, easing: 'linear' },
        }
      ));
      steps.push(makeStep(
        `Keyframe: "${targetLayer.name}" ausgeblendet bei Frame ${frame + 30}, Ease-In`,
        {
          type: 'add_keyframe',
          targetLayerId: targetLayer.id,
          payload: { time: frame + 30, opacity: 0, easing: 'ease-in' },
        }
      ));
    } else {
      // Generische Bewegung
      steps.push(makeStep(
        `Keyframe: "${targetLayer.name}" Position bei Frame ${frame}`,
        {
          type: 'add_keyframe',
          targetLayerId: targetLayer.id,
          payload: { time: frame, opacity: 100, easing: 'ease-out' },
        }
      ));
    }

    // ── Pulsation ──────────────────────────────────────────────────────
  } else if (lower.includes('puls') || lower.includes('pulse') || lower.includes('atm') || lower.includes('bounce') || lower.includes('wackel')) {
    const baseTime = frame;
    steps.push(makeStep(
      `Keyframe: "${targetLayer.name}" Scale 1.0 bei Frame ${baseTime}`,
      {
        type: 'add_keyframe',
        targetLayerId: targetLayer.id,
        payload: { time: baseTime, scale: 100, easing: 'ease-in-out' },
      }
    ));
    steps.push(makeStep(
      `Keyframe: "${targetLayer.name}" Scale 1.1 bei Frame ${baseTime + 15}`,
      {
        type: 'add_keyframe',
        targetLayerId: targetLayer.id,
        payload: { time: baseTime + 15, scale: 110, easing: 'ease-in-out' },
      }
    ));
    steps.push(makeStep(
      `Keyframe: "${targetLayer.name}" Scale zurück 1.0 bei Frame ${baseTime + 30}`,
      {
        type: 'add_keyframe',
        targetLayerId: targetLayer.id,
        payload: { time: baseTime + 30, scale: 100, easing: 'ease-in-out' },
      }
    ));

    // ── Keyframe-Pattern (explizit) ────────────────────────────────────
  } else if (lower.includes('keyframe')) {
    const opacity = lower.includes('ausblend') ? 0 : 100;
    steps.push(makeStep(
      `Keyframe: "${targetLayer.name}" Opacity ${opacity}% bei Frame ${frame}`,
      {
        type: 'add_keyframe',
        targetLayerId: targetLayer.id,
        payload: { time: frame, opacity, easing: 'ease-out' },
      }
    ));

    // ── Neuer Layer ────────────────────────────────────────────────────
  } else if (lower.includes('neue') || lower.includes('neuer') || lower.includes('erstelle') || lower.includes('hinzufügen')) {
    const layerType = detectLayerType(prompt);
    steps.push(makeStep(
      `Neuen ${layerType}-Layer erstellen`,
      {
        type: 'create_layer',
        payload: { type: layerType, name: `Neuer ${layerType}`, startFrame: 0, endFrame: context.totalFrames },
      }
    ));

    // ── Generischer Fallback ───────────────────────────────────────────
  } else {
    steps.push(makeStep(
      `Keyframe: "${targetLayer.name}" bei Frame ${frame}`,
      {
        type: 'add_keyframe',
        targetLayerId: targetLayer.id,
        payload: { time: frame, opacity: 100, easing: 'linear' },
      }
    ));
  }

  const plan: AgentPlan = { steps };
  const message = steps.length > 0
    ? `✦ Ich habe einen Plan mit ${steps.length} Schritt${steps.length > 1 ? 'en' : ''} erstellt:`
    : '✦ Ich konnte keinen passenden Plan erstellen. Beschreibe die Animation genauer!';

  return { message, plan };
}

export const mockAiBackend: AiBackend = {
  async sendMessage(prompt: string, context: ProjectContext): Promise<AiResponse> {
    // Simuliere kurze Verzögerung
    await new Promise((r) => setTimeout(r, 600));

    const lower = prompt.toLowerCase();

    // Hilfe-Anfrage: kein Plan, nur Text
    if (lower.includes('hilfe') || lower.includes('help') || lower.includes('was kannst')) {
      return {
        message: `✦ Ich kann dir helfen mit:\n• **Animationen**: "Logo fliegt von links ein"\n• **Einblenden**: "Text einblenden bei Frame 30"\n• **Ausblenden**: "Shape fade out bei Frame 60"\n• **Pulsieren**: "Bild pulsiert bei Frame 20"\n• **Neue Layer**: "Neuer Text-Layer erstellen"\n\nBeschreibe einfach, was du möchtest!`,
        actions: [],
      };
    }

    const result = generatePlan(prompt, context);
    if (!result) {
      return {
        message: '✦ Beschreibe eine Animation oder erstelle einen neuen Layer, um loszulegen!',
        actions: [],
      };
    }

    return {
      message: result.message,
      actions: [],
      plan: result.plan,
    };
  },
};

// Aktives Backend: Gemini wenn API-Key vorhanden, sonst Mock
function hasApiKey(): boolean {
  return typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_GEMINI_API_KEY;
}

let _activeBackend: AiBackend | null = null;

async function getActiveBackend(): Promise<AiBackend> {
  if (_activeBackend) return _activeBackend;
  if (hasApiKey()) {
    const { geminiBackend } = await import('./ai-gemini');
    _activeBackend = geminiBackend;
    console.log('[KI] Gemini 3.5 Flash Backend aktiv');
  } else {
    _activeBackend = mockAiBackend;
    console.log('[KI] Mock Backend aktiv (kein API-Key)');
  }
  return _activeBackend;
}

// Proxy-Backend: laedt das richtige Backend lazy beim ersten Aufruf
export const aiBackend: AiBackend = {
  async sendMessage(prompt: string, context: ProjectContext): Promise<AiResponse> {
    const backend = await getActiveBackend();
    return backend.sendMessage(prompt, context);
  },
};
