import type { Project, ExportOptions } from '../types/project';

/**
 * IPC-Bridge – Abstraktion für die spätere Tauri-IPC-Anbindung.
 * Aktuell: Mock-Implementierung (Browser-only).
 * Später: Tauri invoke() als Implementierung.
 */
export interface IpcBridge {
  saveProject(project: Project): Promise<void>;
  loadProject(path: string): Promise<Project>;
  renderFrame(project: Project, frame: number): Promise<ImageData | null>;
  exportVideo(project: Project, options: ExportOptions): Promise<void>;
}

// Mock-Implementierung für die UI-Phase
export const mockIpcBridge: IpcBridge = {
  async saveProject(_project: Project): Promise<void> {
    console.log('[IPC Mock] Projekt gespeichert');
  },
  async loadProject(_path: string): Promise<Project> {
    console.log('[IPC Mock] Projekt geladen');
    throw new Error('Nicht implementiert – UI-Phase');
  },
  async renderFrame(_project: Project, _frame: number): Promise<null> {
    console.log('[IPC Mock] Frame gerendert');
    return null;
  },
  async exportVideo(_project: Project, _options: ExportOptions): Promise<void> {
    console.log('[IPC Mock] Video exportiert');
  },
};

// Aktive Bridge – später durch Tauri-Implementierung ersetzbar
export const ipcBridge: IpcBridge = mockIpcBridge;
