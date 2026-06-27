# LuwiMotion – Architektur-Plan: Phase UI/Timeline-Editor

## Übersicht
LuwiMotion ist eine Open-Source KI-Motion-Graphics-Desktop-Anwendung. Diese Phase deckt **nur die UI des Timeline-Editors** ab (Next.js + Tailwind). Keine echte Render-Engine, kein Video-Encoding. Die Architektur ist so konzipiert, dass später Tauri + Rust als Shell/Render-Engine angebunden werden kann.

---

## 1. Projektstruktur

```
luwimotion/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root Layout (Dark Theme, Fonts)
│   │   ├── page.tsx            # Haupt-Editor-Seite
│   │   └── globals.css         # Globale Styles + Tailwind
│   ├── components/
│   │   ├── Toolbar.tsx         # Obere Werkzeugleiste
│   │   ├── LayerPanel.tsx      # Linkes Layer-Panel
│   │   ├── PreviewCanvas.tsx   # Zentraler Preview-Canvas
│   │   ├── AiChatPanel.tsx     # Rechtes KI-Chat-Panel
│   │   ├── Timeline.tsx        # Untere Timeline (Container)
│   │   ├── TimelineTrack.tsx   # Einzelner Track pro Layer
│   │   └── Keyframe.tsx        # Keyframe-Diamant-Icon
│   ├── store/
│   │   └── projectStore.ts     # Zustand-Store (Projekt-State)
│   ├── types/
│   │   └── project.ts          # TypeScript-Typen (= spätere Rust-Structs)
│   ├── lib/
│   │   ├── ai-mock.ts          # Mock-KI-Backend (austauschbar)
│   │   └── ipc-bridge.ts       # Abstraktion für spätere Tauri-IPC
│   └── data/
│       └── mock-data.ts        # Mock-Projektdaten
├── public/
│   └── ...
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 2. Datenmodell (Tauri/Rust-ready)

Die TypeScript-Typen sind 1:1 als Rust-Structs und JSON-Projektformat nutzbar.

```typescript
// Layer-Typen
type LayerType = 'text' | 'shape' | 'image' | 'video';

interface Keyframe {
  id: string;
  time: number;            // Frame-Nummer (0-basiert)
  properties: Record<string, number | string | boolean>;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

interface Layer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;           // Farbcodierung nach Typ
  startFrame: number;
  endFrame: number;
  keyframes: Keyframe[];
  properties: Record<string, any>;  // Layer-spezifische Eigenschaften
}

interface Project {
  id: string;
  name: string;
  width: number;           // Canvas-Breite (px)
  height: number;          // Canvas-Höhe (px)
  fps: number;
  totalFrames: number;
  layers: Layer[];
  currentFrame: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: ChatAction[];  // Vom KI ausgelöste Aktionen
}

interface ChatAction {
  type: 'add_keyframe' | 'modify_layer' | 'create_layer';
  targetLayerId?: string;
  payload: Record<string, any>;
}
```

---

## 3. State-Management (Zustand)

Ein zentraler Store (`projectStore.ts`) verwaltet den gesamten Projekt-State:

- **Projekt-Daten**: Layer, Keyframes, Canvas-Einstellungen
- **UI-State**: Ausgewählter Layer, aktuelles Tool, Zoom-Level
- **Chat-State**: Nachrichten-Verlauf
- **Aktionen**: `selectLayer`, `addKeyframe`, `setCurrentFrame`, `addChatMessage`, `applyChatAction`

Der Store ist von der UI getrennt → einfache Migration zu Tauri-IPC später.

---

## 4. IPC-Bridge (Tauri-Vorbereitung)

`ipc-bridge.ts` definiert eine abstrakte Schnittstelle:

```typescript
interface IpcBridge {
  // Projekt-Operationen
  saveProject(project: Project): Promise<void>;
  loadProject(path: string): Promise<Project>;
  
  // Render-Operationen (später)
  renderFrame(project: Project, frame: number): Promise<ImageData>;
  exportVideo(project: Project, options: ExportOptions): Promise<void>;
}
```

Aktuell: Mock-Implementierung (Browser-only). Später: Tauri `invoke()` als Implementierung.

---

## 5. KI-Backend (austauschbar)

`ai-mock.ts` implementiert ein Interface:

```typescript
interface AiBackend {
  sendMessage(prompt: string, context: ProjectContext): Promise<AiResponse>;
}
```

Aktuell: Mock mit vordefinierten Antworten + simulierten Aktionen.
Später: Eigene Inference-Engine (LuwiLocal-Stil) oder API-Anbindung.

---

## 6. Layout-Architektur

```
┌──────────────────────────────────────────────────────────────┐
│ Toolbar: Logo | Tools (Select/Hand/Pen) | Export | Settings  │
├──────────┬─────────────────────────────┬─────────────────────┤
│ Layer    │                             │ KI-Chat             │
│ Panel    │    Preview-Canvas           │ - Chatverlauf       │
│ (links)  │    (zentriert,              │ - Eingabefeld       │
│ 240px    │     letterbox)              │ 300px               │
│          │                             │                     │
├──────────┴─────────────────────────────┴─────────────────────┤
│ Timeline: Playhead | Controls | Tracks mit Clips/Keyframes   │
│ (horizontal scrollbar/zoombar)                               │
└──────────────────────────────────────────────────────────────┘
```

CSS Grid Layout:
- `grid-template-areas`: toolbar / sidebar-left + canvas + sidebar-right / timeline
- Panels: feste Breiten, Canvas: flexibel
- Timeline: feste Höhe unten

---

## 7. Komponenten-Details

### Toolbar
- Logo "LuwiMotion" links
- Tool-Buttons: Auswahl (V), Hand (H), Stift (P) – mit Keyboard-Shortcuts
- Export-Button (primär, rechts)
- Canvas-Settings: Auflösung-Dropdown, FPS-Dropdown

### LayerPanel
- Liste aller Layer, sortiert nach Reihenfolge
- Farbcodierter Streifen links pro Layer (Text=blau, Form=grün, Bild=orange, Video=lila)
- Sichtbarkeit-Auge + Lock-Icon pro Layer
- Klick → Layer auswählen (Highlight)

### PreviewCanvas
- Zentrierter Frame mit Letterbox (schwarze Balken bei abweichendem Verhältnis)
- Zeigt Mock-Content des aktuell ausgewählten Frames
- Rahmen um ausgewählte Layer-Elemente

### AiChatPanel
- Chatverlauf: User-Bubble + KI-Bubble (mit Sparkle-Icon ✦)
- KI-Antworten zeigen ausgelöste Aktionen an (z.B. "Keyframe bei Frame 30 hinzugefügt")
- Eingabefeld unten mit Placeholder "Animation beschreiben…"
- Mock-Antwort-Logik: erkennt Keywords → erstellt Keyframes/Layer

### Timeline
- Header: Zeit-Markierungen (Frame-Nummern)
- Playhead: vertikale rote Linie, per Klick positionierbar
- Transport-Controls: Play/Pause, Skip Forward/Back, Frame-Anzeige
- Pro Layer ein Track mit:
  - Clip-Balken (farbig, Start→Ende)
  - Keyframe-Diamanten an den jeweiligen Positionen
- Horizontal scrollbar + Zoom-Slider

### Keyframe
- Diamant-Form (CSS rotate 45deg)
- Farblich passend zum Layer-Typ
- Hover-Tooltip mit Frame-Nummer und Properties

---

## 8. Styling

- **Dark Theme**: Hintergrund #0f0f0f, Panels #1a1a1a, Borders #2a2a2a
- **Akzentfarbe**: #7c5cff (Lila) für Selections
- **KI-Akzent**: ✦ Sparkle-Icon, Gradient #a855f7 → #6366f1
- **Schriftgrößen**: 11px (Labels), 12px (Panel-Text), 13px (UI-Elemente)
- **Tailwind Config**: Custom Colors für alle Editor-Farben

---

## 9. Interaktions-Flows

### Layer auswählen
1. Klick auf Layer im LayerPanel → `selectLayer(id)` im Store
2. LayerPanel: Highlight aktiv
3. PreviewCanvas: Rahmen um Layer-Element
4. Timeline: Track-Highlight

### Chat → Keyframe
1. User tippt "Text-Layer bei Frame 30 einblenden"
2. Mock-KI parst Keyword → erstellt ChatAction
3. Store: `applyChatAction` → fügt Keyframe zu Layer hinzu
4. Timeline: Keyframe-Diamant erscheint
5. Chat: Bestätigung "Keyframe bei Frame 30 für 'Titel' hinzugefügt"

### Playhead bewegen
1. Klick auf Timeline-Leiste → `setCurrentFrame(frame)`
2. Playhead bewegt sich
3. PreviewCanvas zeigt entsprechenden Frame
4. Frame-Anzeige aktualisiert sich
