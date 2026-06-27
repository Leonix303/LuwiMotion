import { create } from 'zustand';
import type { Layer, Keyframe, ChatMessage, ToolType, ChatAction, LayerType, AgentPlan } from '../types/project';
import { LAYER_COLORS } from '../types/project';
import { mockProject } from '../data/mock-data';
import { aiBackend } from '../lib/ai-mock';

interface ProjectState {
  // Projekt-Daten
  projectName: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  layers: Layer[];
  currentFrame: number;

  // UI-State
  selectedLayerId: string | null;
  activeTool: ToolType;
  isPlaying: boolean;
  zoomLevel: number;
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  // Agent-Plan-State
  activePlan: AgentPlan | null;
  activePlanMessageId: string | null;
  planExecuting: boolean;

  // Export-State
  isExporting: boolean;
  exportProgress: number; // 0–100
  exportRequested: boolean; // Toolbar → PreviewCanvas Signal
  exportDone: boolean;
  exportFileName: string;

  // Aktionen – Projekt
  setCurrentFrame: (frame: number) => void;
  setProjectSettings: (settings: { width?: number; height?: number; fps?: number; totalFrames?: number }) => void;

  // Aktionen – Layer
  selectLayer: (id: string | null) => void;
  addLayer: (type: LayerType, name: string, startFrame?: number, endFrame?: number) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  removeLayer: (id: string) => void;

  // Aktionen – Keyframes
  addKeyframe: (layerId: string, time: number, properties: Record<string, number | string | boolean>, easing?: Keyframe['easing']) => void;

  // Aktionen – Tool
  setActiveTool: (tool: ToolType) => void;

  // Aktionen – Playback
  togglePlayback: () => void;
  setIsPlaying: (playing: boolean) => void;

  // Aktionen – Zoom
  setZoomLevel: (zoom: number) => void;

  // Aktionen – Chat
  sendChatMessage: (content: string) => Promise<void>;
  applyChatActions: (actions: ChatAction[]) => void;

  // Aktionen – Agent-Plan
  executePlan: (messageId: string, plan: AgentPlan) => Promise<void>;
  updatePlanStep: (messageId: string, stepId: string, done: boolean) => void;

  // Aktionen – Export
  requestExport: () => void;      // Toolbar: Export anfragen
  setExportProgress: (p: number) => void;
  setExportDone: (fileName: string) => void;
  resetExport: () => void;
}

let idCounter = 100;
function genId(prefix: string) {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initiale Daten aus Mock
  projectName: mockProject.name,
  width: mockProject.width,
  height: mockProject.height,
  fps: mockProject.fps,
  totalFrames: mockProject.totalFrames,
  layers: mockProject.layers,
  currentFrame: mockProject.currentFrame,

  selectedLayerId: null,
  activeTool: 'select',
  isPlaying: false,
  zoomLevel: 1,
  chatMessages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: '✦ Hallo! Ich bin dein KI-Assistent für LuwiMotion. Beschreibe eine Animation oder stelle eine Frage, um loszulegen.',
      timestamp: Date.now(),
    },
  ],
  chatLoading: false,

  // Agent-Plan-State
  activePlan: null,
  activePlanMessageId: null,
  planExecuting: false,

  // Export-State
  isExporting: false,
  exportProgress: 0,
  exportRequested: false,
  exportDone: false,
  exportFileName: '',

  // Projekt
  setCurrentFrame: (frame) => set({ currentFrame: Math.max(0, Math.min(frame, get().totalFrames - 1)) }),
  setProjectSettings: (settings) => set((s) => ({
    width: settings.width ?? s.width,
    height: settings.height ?? s.height,
    fps: settings.fps ?? s.fps,
    totalFrames: settings.totalFrames ?? s.totalFrames,
  })),

  // Layer
  selectLayer: (id) => set({ selectedLayerId: id }),
  addLayer: (type, name, startFrame = 0, endFrame) => {
    const { totalFrames, layers, width, height } = get();
    const newLayer: Layer = {
      id: genId('layer'),
      type,
      name,
      visible: true,
      locked: false,
      color: LAYER_COLORS[type],
      startFrame,
      endFrame: endFrame ?? totalFrames,
      keyframes: [],
      properties: {
        opacity: 100,
        x: width / 2,
        y: height / 2,
        width: type === 'text' ? 300 : type === 'image' ? 200 : 400,
        height: type === 'text' ? 60 : type === 'image' ? 200 : 300,
        ...(type === 'text' ? { text: name, fontSize: 48, color: '#ffffff' } : {}),
        ...(type === 'shape' ? { shape: 'rectangle', fill: LAYER_COLORS.shape, scale: 100 } : {}),
      },
    };
    set({ layers: [...layers, newLayer], selectedLayerId: newLayer.id });
  },
  toggleLayerVisibility: (id) => set((s) => ({
    layers: s.layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l),
  })),
  toggleLayerLock: (id) => set((s) => ({
    layers: s.layers.map((l) => l.id === id ? { ...l, locked: !l.locked } : l),
  })),
  removeLayer: (id) => set((s) => ({
    layers: s.layers.filter((l) => l.id !== id),
    selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
  })),

  // Keyframes
  addKeyframe: (layerId, time, properties, easing = 'ease-out') => {
    set((s) => ({
      layers: s.layers.map((l) => {
        if (l.id !== layerId) return l;
        const newKf: Keyframe = { id: genId('kf'), time, properties, easing };
        const keyframes = [...l.keyframes, newKf].sort((a, b) => a.time - b.time);
        return { ...l, keyframes };
      }),
    }));
  },

  // Tool
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Playback
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  // Zoom
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(0.25, Math.min(zoom, 4)) }),

  // Export
  requestExport: () => set({ exportRequested: true, isExporting: true, exportProgress: 0, exportDone: false, exportFileName: '' }),
  setExportProgress: (p) => set({ exportProgress: Math.min(100, Math.max(0, p)) }),
  setExportDone: (fileName) => set({ exportDone: true, exportFileName: fileName, isExporting: false, exportRequested: false }),
  resetExport: () => set({ isExporting: false, exportProgress: 0, exportRequested: false, exportDone: false, exportFileName: '' }),

  // Chat
  sendChatMessage: async (content) => {
    const state = get();
    const userMsg: ChatMessage = {
      id: genId('msg'),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    set({ chatMessages: [...state.chatMessages, userMsg], chatLoading: true });

    try {
      const context = {
        layers: state.layers,
        currentFrame: state.currentFrame,
        fps: state.fps,
        totalFrames: state.totalFrames,
      };
      const response = await aiBackend.sendMessage(content, context);

      // Plan-basierte Antwort (neuer Flow)
      if (response.plan && response.plan.steps.length > 0) {
        const planMsgId = genId('msg');
        const assistantMsg: ChatMessage = {
          id: planMsgId,
          role: 'assistant',
          content: response.message,
          timestamp: Date.now(),
          plan: response.plan,
        };

        set((s) => ({
          chatMessages: [...s.chatMessages, assistantMsg],
          chatLoading: false,
          activePlan: response.plan!,
          activePlanMessageId: planMsgId,
        }));

        // Plan sequenziell ausfuehren
        get().executePlan(planMsgId, response.plan);
        return;
      }

      // Legacy: flache Aktionen (z.B. Hilfe-Antwort ohne Plan)
      const assistantMsg: ChatMessage = {
        id: genId('msg'),
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        actions: response.actions,
      };

      if (response.actions.length > 0) {
        get().applyChatActions(response.actions);
      }

      set((s) => ({
        chatMessages: [...s.chatMessages, assistantMsg],
        chatLoading: false,
      }));
    } catch {
      const errorMsg: ChatMessage = {
        id: genId('msg'),
        role: 'assistant',
        content: '✦ Fehler bei der Verarbeitung. Bitte versuche es erneut.',
        timestamp: Date.now(),
      };
      set((s) => ({ chatMessages: [...s.chatMessages, errorMsg], chatLoading: false }));
    }
  },

  applyChatActions: (actions) => {
    for (const action of actions) {
      if (action.type === 'add_keyframe' && action.targetLayerId) {
        const { time, ...props } = action.payload;
        get().addKeyframe(
          action.targetLayerId,
          Number(time) ?? get().currentFrame,
          props as Record<string, number | string | boolean>,
          (props.easing as Keyframe['easing']) ?? 'ease-out'
        );
      } else if (action.type === 'create_layer') {
        const layerType = String(action.payload.type) as LayerType;
        const name = String(action.payload.name) ?? 'Neuer Layer';
        get().addLayer(layerType, name, Number(action.payload.startFrame) ?? 0, Number(action.payload.endFrame));
      }
    }
  },

  // Agent-Plan: Einzelnen Schritt im Chat-Message als erledigt markieren
  updatePlanStep: (messageId, stepId, done) => {
    set((s) => ({
      chatMessages: s.chatMessages.map((msg) => {
        if (msg.id !== messageId || !msg.plan) return msg;
        return {
          ...msg,
          plan: {
            steps: msg.plan.steps.map((step) =>
              step.id === stepId ? { ...step, done } : step
            ),
          },
        };
      }),
      // activePlan synchron halten
      activePlan: s.activePlanMessageId === messageId && s.activePlan
        ? {
            steps: s.activePlan.steps.map((step) =>
              step.id === stepId ? { ...step, done } : step
            ),
          }
        : s.activePlan,
    }));
  },

  // Agent-Plan: Sequenzielle Abarbeitung mit sichtbarem Fortschritt
  executePlan: async (messageId, plan) => {
    set({ planExecuting: true });

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // Kurze Pause vor dem naechsten Schritt (sichtbarer Effekt)
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 500));
      }

      // Aktion ausfuehren
      const action = step.action;
      if (action.type === 'add_keyframe' && action.targetLayerId) {
        const { time, easing, ...props } = action.payload;
        get().addKeyframe(
          action.targetLayerId,
          Number(time) ?? get().currentFrame,
          props as Record<string, number | string | boolean>,
          (easing as Keyframe['easing']) ?? 'ease-out'
        );
      } else if (action.type === 'create_layer') {
        const layerType = String(action.payload.type) as LayerType;
        const name = String(action.payload.name) ?? 'Neuer Layer';
        get().addLayer(layerType, name, Number(action.payload.startFrame) ?? 0, Number(action.payload.endFrame));
      } else if (action.type === 'modify_layer' && action.targetLayerId) {
        // Modify-Layer-Action: Properties auf dem Layer aktualisieren
        set((s) => ({
          layers: s.layers.map((l) =>
            l.id === action.targetLayerId
              ? { ...l, properties: { ...l.properties, ...action.payload } }
              : l
          ),
        }));
      }

      // Schritt als erledigt markieren (triggert UI-Update)
      get().updatePlanStep(messageId, step.id, true);
    }

    // Kurze Pause vor Abschluss-Message
    await new Promise((r) => setTimeout(r, 400));

    // Abschluss-Bestaetigung im Chat
    const doneMsg: ChatMessage = {
      id: genId('msg'),
      role: 'assistant',
      content: `✦ Fertig: ${plan.steps.length} Schritt${plan.steps.length > 1 ? 'e' : ''} ausgeführt – alle Keyframes gesetzt!`,
      timestamp: Date.now(),
    };
    set((s) => ({
      chatMessages: [...s.chatMessages, doneMsg],
      activePlan: null,
      activePlanMessageId: null,
      planExecuting: false,
    }));
  },
}));
