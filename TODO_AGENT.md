# TODO_AGENT – Plan-basierter KI-Chat-Agent

## Implementierung

- [x] **Typen definieren** – `AgentStepAction`, `AgentStep`, `AgentPlan` in `types/project.ts`
- [x] **AiResponse erweitern** – optionales `plan: AgentPlan` Feld
- [x] **ChatMessage erweitern** – optionales `plan: AgentPlan` Feld fuer Live-Rendering
- [x] **Mock-KI umstellen** – `lib/ai-mock.ts` generiert `AgentPlan` statt flacher Aktionen
  - [x] Einblend-/Fade-Pattern -> 2 Schritte
  - [x] Bewegungs-Pattern (von links/rechts einfliegen) -> 2-3 Schritte
  - [x] Pulsations-Pattern -> 3 Schritte
  - [x] Generischer Fallback -> 1 Schritt
- [x] **Store erweitern** – `store/projectStore.ts`
  - [x] Neue State-Felder: `activePlan`, `activePlanMessageId`
  - [x] `sendChatMessage` anpassen: Plan speichern, `executePlan` aufrufen
  - [x] `executePlan(messageId, plan)` implementieren: sequenzielle Abarbeitung mit Delay
- [x] **Chat-UI anpassen** – `components/AiChatPanel.tsx`
  - [x] Checkbox-Liste rendern wenn `msg.plan` vorhanden
  - [x] Abgehakte/offene Schritte-Icons
  - [x] Abschluss-Bestaetigung nach letztem Schritt
- [x] **Verifizieren** – Dev-Server starten, End-to-End-Test im Browser
