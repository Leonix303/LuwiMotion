// LuwiMotion Datenmodell – 1:1 als Rust-Struct / JSON-Projektformat nutzbar

export type LayerType = 'text' | 'shape' | 'image' | 'video';
export type Easing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type ToolType = 'select' | 'hand' | 'pen';

export interface Keyframe {
  id: string;
  time: number; // Frame-Nummer (0-basiert)
  properties: Record<string, number | string | boolean>;
  easing: Easing;
}

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  startFrame: number;
  endFrame: number;
  keyframes: Keyframe[];
  properties: Record<string, number | string | boolean>;
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  layers: Layer[];
  currentFrame: number;
}

export interface ChatAction {
  type: 'add_keyframe' | 'modify_layer' | 'create_layer';
  targetLayerId?: string;
  payload: Record<string, number | string | boolean>;
}

// Agent-Plan-System: Strukturierter Plan statt flacher Aktionen
export interface AgentStepAction {
  type: 'add_keyframe' | 'create_layer' | 'modify_layer';
  targetLayerId?: string;
  payload: Record<string, number | string | boolean>;
}

export interface AgentStep {
  id: string;
  description: string;
  action: AgentStepAction;
  done: boolean;
}

export interface AgentPlan {
  steps: AgentStep[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: ChatAction[];
  plan?: AgentPlan;
}

export interface ExportOptions {
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  outputPath: string;
}

export interface ProjectContext {
  layers: Layer[];
  currentFrame: number;
  fps: number;
  totalFrames: number;
}

export interface AiResponse {
  message: string;
  actions: ChatAction[];
  plan?: AgentPlan;
}

// KI-Backend Interface – austauschbar zwischen Mock und echter KI
export interface AiBackend {
  sendMessage(prompt: string, context: ProjectContext): Promise<AiResponse>;
}

// Farbzuordnung pro Layer-Typ
export const LAYER_COLORS: Record<LayerType, string> = {
  text: '#3b82f6',    // Blau
  shape: '#22c55e',   // Grün
  image: '#f97316',   // Orange
  video: '#a855f7',   // Lila
};
