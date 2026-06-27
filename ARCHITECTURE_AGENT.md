# ARCHITECTURE_AGENT – Plan-basiertes KI-Chat-Verhalten

## 1. Ziel

Der KI-Assistent im Chat-Panel setzt Nutzeranfragen nicht mehr sofort in Keyframes um, sondern erstellt zuerst einen **Plan** (ToDo-Liste von Einzelschritten). Dieser Plan wird als Checkbox-Liste im Chat angezeigt und **Schritt für Schritt** mit sichtbarem Fortschritt abgearbeitet.

---

## 2. Datenformat

### AgentPlan

```ts
interface AgentStepAction {
  type: 'add_keyframe' | 'create_layer' | 'modify_layer';
  targetLayerId?: string;
  payload: Record<string, number | string | boolean>;
}

interface AgentStep {
  id: string;           // Eindeutige Schritt-ID
  description: string;  // Menschlich lesbare Beschreibung
  action: AgentStepAction;
  done: boolean;        // Wird live auf true gesetzt
}

interface AgentPlan {
  steps: AgentStep[];
}
```

### AiResponse (erweitert)

```ts
interface AiResponse {
  message: string;          // Einleitungstext zum Plan
  actions: ChatAction[];    // Legacy – bleibt fuer Abwaertskompatibilitaet
  plan?: AgentPlan;         // NEU: der schrittweise Plan
}
```

### ChatMessage (erweitert)

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: ChatAction[];
  plan?: AgentPlan;         // NEU: Referenz auf den Plan (reaktiv)
}
```

---

## 3. State-Flow

```
1. User gibt Prompt ein
       |
2. sendChatMessage() -> aiBackend.sendMessage()
       |
3. KI generiert AiResponse mit plan: AgentPlan
       |
4. Assistant-ChatMessage wird mit plan erstellt
       |
5. executePlan(messageId, plan) gestartet:
   - Fuer jeden Schritt:
     a. action ausfuehren (add_keyframe / create_layer / modify_layer)
     b. step.done = true setzen (loest UI-Update aus)
     c. ~500ms Delay
       |
6. Abschluss-ChatMessage: "Fertig: N Schritte ausgefuehrt"
```

---

## 4. Komponenten-Aenderungen

### `types/project.ts`
- Neue Interfaces: `AgentStepAction`, `AgentStep`, `AgentPlan`
- `AiResponse` um optionales `plan` erweitern
- `ChatMessage` um optionales `plan` erweitern

### `lib/ai-mock.ts`
- `AiBackend`-Interface bleibt identisch (austauschbar)
- `mockAiBackend.sendMessage()` gibt `AgentPlan` zurueck statt flacher `actions[]`
- Pattern-Matching generiert thematisch passende Planschritte

### `store/projectStore.ts`
- Neuer State: `activePlan`, `activePlanMessageId`
- `sendChatMessage`: speichert Plan im Chat-Message, ruft `executePlan()` auf
- Neue Funktion `executePlan(messageId, plan)`: sequenzielle Ausfuehrung mit Delay
- `applyChatActions` bleibt erhalten (Legacy)

### `components/AiChatPanel.tsx`
- Wenn `msg.plan` vorhanden: Checkbox-Liste rendern
- Jeder Schritt: `[x]` oder `[ ]` Icon + Beschreibung
- Nach letztem Schritt: Bestaetigungs-Text

---

## 5. Austauschbarkeit

Die Architektur ist so gestaltet, dass **nur `lib/ai-mock.ts`** ausgetauscht werden muss, um eine echte Inference-Engine anzubinden. Der restliche Flow (Plan anzeigen, sequenziell ausfuehren) bleibt unveraendert.

```
[ai-mock.ts]          -> Mock: Keyword-basierte Plan-Generierung
[echte-ki.ts]         -> Spaeter: LLM/Inference generiert AgentPlan
          |
          v
   AiResponse.plan    -> Identisches Format
          |
          v
   projectStore       -> Identischer executePlan-Flow
          |
          v
   AiChatPanel        -> Identische Checkbox-Darstellung
```
