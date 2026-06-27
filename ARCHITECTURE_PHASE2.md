# LuwiMotion – Phase 2: Render-Engine (Rust + Tauri)

## Übersicht
Phase 2 erweitert die bestehende Next.js-UI um eine echte Rust-Engine via Tauri-IPC.
Fokus: Datenmodell in Rust, Frame-Interpolation, Tauri-Commands.
**Kein** GPU-Rendering, **kein** Video-Export, **keine** echte KI.

---

## 1. Architektur-Diagramm

```
┌──────────────────────────────────────────────────────────────────────┐
│  Tauri-Window                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (Webview)                                    │  │
│  │  ┌──────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐ │  │
│  │  │ Toolbar  │  │ LayerPanel  │  │ Preview   │  │ AiChat    │ │  │
│  │  │          │  │             │  │ Canvas    │  │ Panel     │ │  │
│  │  └──────────┘  └─────────────┘  └─────┬─────┘  └───────────┘ │  │
│  │                                        │                       │  │
│  │  ┌─────────────────────────────────────┤                       │  │
│  │  │ Timeline                            │                       │  │
│  │  └─────────────────────────────────────┘                       │  │
│  │                  │                                             │  │
│  │  ┌───────────────┴───────────────┐                             │  │
│  │  │ IPC Bridge (@tauri-apps/api)  │ ◄── invoke()               │  │
│  │  └───────────────┬───────────────┘                             │  │
│  └──────────────────┼─────────────────────────────────────────────┘  │
│                     │ Tauri-IPC                                       │
│  ┌──────────────────┴─────────────────────────────────────────────┐  │
│  │  Rust-Backend (src-tauri/src/)                                 │  │
│  │  ┌─────────────┐  ┌────────────────┐  ┌────────────────────┐  │  │
│  │  │ model.rs    │  │ interpolation  │  │ commands.rs        │  │  │
│  │  │ (Structs)   │  │ .rs (Engine)   │  │ (Tauri Commands)   │  │  │
│  │  └─────────────┘  └────────────────┘  └────────────────────┘  │  │
│  │                     │                                          │  │
│  │  ┌──────────────────┴──────────────────┐                       │  │
│  │  │ AppState (Mutex<Project>)           │                       │  │
│  │  └─────────────────────────────────────┘                       │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Datenmodell (Rust ↔ TypeScript)

Die Rust-Structs bilden das TypeScript-Interface 1:1 ab. Serialisierung via serde.

| TypeScript | Rust |
|---|---|
| `LayerType = 'text' \| 'shape' \| ...` | `enum LayerType { Text, Shape, Image, Video }` |
| `Easing = 'linear' \| 'ease-in' \| ...` | `enum Easing { Linear, EaseIn, EaseOut, EaseInOut }` |
| `Keyframe { id, time, properties, easing }` | `struct Keyframe { id, time, properties: Value, easing }` |
| `Layer { id, type, name, ... }` | `struct Layer { id, layer_type, name, ... }` |
| `Project { id, name, width, height, ... }` | `struct Project { id, name, width, height, ... }` |

### Property-Handling
Keyframe-Properties sind `serde_json::Value` (JSON), da das Frontend
`Record<string, number | string | boolean>` sendet. Die Interpolation
extrahiert `f64`-Werte per `.as_f64()` und interpoliert nur numerische Properties.

---

## 3. Interpolation-Engine

### Algorithmus
1. Finde die zwei Keyframes, die den gegebenen Zeitpunkt umschließen
2. Berechne den normalisierten Progress (0.0–1.0)
3. Wende Easing-Funktion auf Progress an
4. Interpoliere jeden numerischen Property-Wert linear mit dem eased Progress

### Easing-Funktionen
```
Linear:     f(t) = t
EaseIn:     f(t) = t²
EaseOut:    f(t) = 1 - (1-t)²
EaseInOut:  f(t) = t<0.5 → 2t² : 1-(-2t+2)²/2
```

### Output
`FrameState { layers: Vec<LayerFrameState> }` mit:
- `layer_id`, `visible`, `layer_type`
- `computed_properties: HashMap<String, f64>` — interpolierte Werte

---

## 4. Tauri-Commands (IPC)

| Command | Parameter | Rückgabe | Beschreibung |
|---|---|---|---|
| `get_project` | — | `Project` | Komplettes Projekt |
| `compute_frame` | `time: f64` | `FrameState` | Interpolierte Layer-Werte |
| `add_keyframe` | `layer_id, keyframe` | `Layer` | Keyframe hinzufügen |
| `update_keyframe` | `layer_id, keyframe` | `Layer` | Keyframe aktualisieren |
| `delete_keyframe` | `layer_id, keyframe_id` | `Layer` | Keyframe löschen |

Alle Commands nutzen `State<Mutex<Project>>` für Thread-sicheren Zugriff.

---

## 5. Frontend-Anbindung

### IPC-Bridge (neu)
```typescript
// lib/tauri-bridge.ts
import { invoke } from '@tauri-apps/api/core';

export async function getProject(): Promise<Project> { ... }
export async function computeFrame(time: number): Promise<FrameState> { ... }
export async function addKeyframe(layerId, keyframe): Promise<Layer> { ... }
// ...
```

### Fallback-Logik
Die App erkennt automatisch, ob sie im Tauri-Context läuft:
- **Tauri vorhanden** → echte IPC-Calls an Rust
- **Browser-only** → Mock-Implementierung (Phase 1 bleibt lauffähig)

### PreviewCanvas-Integration
- Bei `currentFrame`-Änderung: `computeFrame(currentFrame / fps)` aufrufen
- Rückgabe `FrameState` → interpolierte Werte für Position, Opacity, Scale, Rotation
- Canvas zeigt echte interpolierte Werte statt Mock-Progress

---

## 6. Dateistruktur (neu)

```
luwimotion/
├── src-tauri/
│   ├── Cargo.toml              # Rust-Dependencies
│   ├── tauri.conf.json         # Tauri-Konfiguration
│   ├── icons/                  # App-Icons (Placeholder)
│   └── src/
│       ├── main.rs             # Prevent close_on_requested, main entry
│       ├── lib.rs              # Tauri-Builder, State, Commands
│       ├── model.rs            # Datenmodell-Structs
│       ├── interpolation.rs    # Interpolation-Engine + Tests
│       └── commands.rs         # Tauri-Commands
├── lib/
│   ├── tauri-bridge.ts         # Echte Tauri-IPC-Bridge (NEU)
│   └── ipc-bridge.ts           # Erweitert um Tauri-Fallback
├── store/
│   └── projectStore.ts         # Erweitert: frameState, computeFrame()
├── components/
│   ├── PreviewCanvas.tsx       # Nutzt frameState für Darstellung
│   └── Timeline.tsx            # Triggert computeFrame bei Scrub
└── types/
    └── project.ts              # Erweitert: FrameState, LayerFrameState
```

---

## 7. Dev-Workflow

```bash
# Terminal 1: Next.js Dev-Server
npm run dev

# Terminal 2: Tauri Dev (öffnet Fenster mit Next.js)
cargo tauri dev
```

Tauri lädt `http://localhost:3000` im Webview. Hot-Reload funktioniert für
sowohl Frontend (Next.js) als auch Backend (Rust-Recompile bei Änderung).

---

## 8. Grenzen dieser Phase
- Kein GPU-Rendering (nur Datenberechnung)
- Kein Video-Export/Encoding
- Keine echte KI (Chat bleibt Mock)
- Properties werden nur numerisch interpoliert (Strings/Booleans bleiben statisch)
- Kein Undo/Redo
- Kein Datei-Speichern/Laden (nur In-Memory-State)
