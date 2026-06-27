# LuwiMotion – TODO: Phase UI/Timeline-Editor

## Setup & Konfiguration
- [x] Next.js-Projekt mit App Router + TypeScript initialisieren
- [x] Tailwind CSS konfigurieren (Dark Theme, Custom Colors)
- [x] TypeScript-Typen definieren (`types/project.ts`)
- [x] Zustand installieren und Store-Grundgerüst (`store/projectStore.ts`)

## Datenmodell & Mock-Daten
- [x] Typen: Layer, Keyframe, Project, ChatMessage, ChatAction
- [x] Mock-Daten: Beispielprojekt mit 3 Layern und Keyframes (`data/mock-data.ts`)
- [x] Zustand-Store: Aktionen (selectLayer, addKeyframe, setCurrentFrame, etc.)
- [x] IPC-Bridge Interface (`lib/ipc-bridge.ts`)
- [x] KI-Backend Interface + Mock (`lib/ai-mock.ts`)

## Layout-Grundgerüst
- [x] Root Layout (`app/layout.tsx`) – Dark Theme, CSS Grid
- [x] Hauptseite (`app/page.tsx`) – Grid-Areas für alle Panels
- [x] Globale Styles (`app/globals.css`)

## Komponenten
- [x] Toolbar: Logo, Tool-Buttons, Export, Canvas-Settings
- [x] LayerPanel: Layer-Liste, Farbcodierung, Sichtbarkeit/Lock
- [x] PreviewCanvas: Zentrierter Frame, Letterbox, Mock-Content
- [x] AiChatPanel: Chatverlauf, Eingabefeld, Mock-Antwort
- [x] Timeline: Header, Playhead, Transport-Controls, Zoom
- [x] TimelineTrack: Clip-Balken, Keyframe-Diamanten pro Layer
- [x] Keyframe: Diamant-Form, Hover-Tooltip

## Interaktionen (Mock)
- [x] Layer auswählen → Highlight in Panel + Timeline
- [x] Chat-Nachricht senden → Mock-Antwort + Mock-Keyframe auf Timeline
- [x] Playhead bewegen → Frame-Anzeige aktualisieren
- [x] Play/Pause → Animierter Playhead

## Feinschliff
- [x] Dark Theme konsistent durchgezogen
- [x] Sparkle-Akzent für KI-Elemente
- [x] Kompakte Schriftgrößen (11-13px)
- [x] Keyboard-Shortcuts für Tools (V/H/P)
- [x] Responsive Panels (minimale Breiten)
