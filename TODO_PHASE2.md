# LuwiMotion – TODO Phase 2: Render-Engine (Rust + Tauri)

## Tauri-Setup
- [ ] `@tauri-apps/cli` und `@tauri-apps/api` installieren
- [ ] `src-tauri/` Verzeichnis erstellen
- [ ] `Cargo.toml` mit Tauri v2 + serde Dependencies
- [ ] `tauri.conf.json` mit Next.js devUrl/build-Konfiguration
- [ ] `next.config.ts` für statischen Export konfigurieren
- [ ] Rust-Toolchain installieren (requires: ~2GB freier Speicher)

## Rust-Datenmodell
- [ ] `model.rs`: Enums (LayerType, Easing) mit serde Serialize/Deserialize
- [ ] `model.rs`: Structs (Keyframe, Layer, Project) — 1:1 Mapping zu TypeScript
- [ ] `model.rs`: FrameState + LayerFrameState (Output der Interpolation)
- [ ] `model.rs`: `create_mock_project()` für initiale Daten

## Interpolation-Engine
- [ ] `interpolation.rs`: Easing-Funktionen (linear, ease-in, ease-out, ease-in-out)
- [ ] `interpolation.rs`: `interpolate_value()` — lerp zwischen zwei f64-Werten
- [ ] `interpolation.rs`: `interpolate_properties()` — alle Properties eines Keyframe-Paars
- [ ] `interpolation.rs`: `find_bounding_keyframes()` — umschließende Keyframes finden
- [ ] `interpolation.rs`: `compute_layer_frame()` — kompletter Layer zum Zeitpunkt
- [ ] `interpolation.rs`: `compute_frame_state()` — alle Layer interpolieren
- [ ] `interpolation.rs`: Unit-Tests für alle Easing-Funktionen und Edge-Cases

## Tauri-Commands
- [ ] `commands.rs`: `get_project()` → Project
- [ ] `commands.rs`: `compute_frame(time)` → FrameState
- [ ] `commands.rs`: `add_keyframe(layer_id, keyframe)` → Layer
- [ ] `commands.rs`: `update_keyframe(layer_id, keyframe)` → Layer
- [ ] `commands.rs`: `delete_keyframe(layer_id, keyframe_id)` → Layer

## Tauri-App-Entry
- [ ] `main.rs`: main() mit prevent_default_close
- [ ] `lib.rs`: Tauri-Builder, AppState, Command-Registrierung

## Frontend-Anbindung
- [ ] `types/project.ts`: FrameState + LayerFrameState Typen ergänzen
- [ ] `lib/tauri-bridge.ts`: Echte IPC-Funktionen mit @tauri-apps/api invoke()
- [ ] `lib/ipc-bridge.ts`: Tauri-Erkennung + Fallback-Logik
- [ ] `store/projectStore.ts`: `frameState` State + `computeFrame()` Action
- [ ] `store/projectStore.ts`: `addKeyframe`/`deleteKeyframe` über IPC
- [ ] `components/PreviewCanvas.tsx`: Nutze `frameState` für interpolierte Darstellung
- [ ] `components/Toolbar.tsx`: Engine-Status-Anzeige (Rust/Browser)

## Build & Test
- [ ] Rust: `cargo test` in src-tauri/ (Interpolation-Tests)
- [ ] Rust: `cargo build` erfolgreich
- [ ] Tauri: `cargo tauri build` erfolgreich
- [ ] Frontend: `npm run build` erfolgreich
- [ ] Integration: Timeline-Bewegung → Rust compute_frame → PreviewCanvas zeigt interpolierte Werte
