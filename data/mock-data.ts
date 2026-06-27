import type { Project, Layer } from '../types/project';
import { LAYER_COLORS } from '../types/project';

const mockLayers: Layer[] = [
  {
    id: 'layer-1',
    type: 'text',
    name: 'Titel',
    visible: true,
    locked: false,
    color: LAYER_COLORS.text,
    startFrame: 0,
    endFrame: 90,
    keyframes: [
      { id: 'kf-1a', time: 0, properties: { opacity: 0, x: 200, y: 540 }, easing: 'ease-out' },
      { id: 'kf-1b', time: 30, properties: { opacity: 100, x: 960, y: 540 }, easing: 'linear' },
      { id: 'kf-1c', time: 90, properties: { opacity: 100, x: 960, y: 540 }, easing: 'ease-in' },
    ],
    properties: { text: 'LuwiMotion', fontSize: 64, color: '#ffffff', opacity: 100, x: 960, y: 540, width: 500, height: 80 },
  },
  {
    id: 'layer-2',
    type: 'shape',
    name: 'Hintergrund-Form',
    visible: true,
    locked: false,
    color: LAYER_COLORS.shape,
    startFrame: 0,
    endFrame: 120,
    keyframes: [
      { id: 'kf-2a', time: 0, properties: { scale: 0, opacity: 0 }, easing: 'ease-out' },
      { id: 'kf-2b', time: 20, properties: { scale: 100, opacity: 80 }, easing: 'linear' },
    ],
    properties: { shape: 'rectangle', width: 500, height: 320, fill: '#22c55e', opacity: 80, scale: 100, x: 960, y: 540 },
  },
  {
    id: 'layer-3',
    type: 'image',
    name: 'Logo-Asset',
    visible: true,
    locked: true,
    color: LAYER_COLORS.image,
    startFrame: 10,
    endFrame: 100,
    keyframes: [
      { id: 'kf-3a', time: 10, properties: { opacity: 0, rotation: -15 }, easing: 'ease-in-out' },
      { id: 'kf-3b', time: 30, properties: { opacity: 100, rotation: 0 }, easing: 'linear' },
      { id: 'kf-3c', time: 60, properties: { opacity: 100, rotation: 5 }, easing: 'ease-in' },
      { id: 'kf-3d', time: 100, properties: { opacity: 0, rotation: 15 }, easing: 'ease-in' },
    ],
    properties: { src: '/logo.png', width: 120, height: 120, opacity: 100, rotation: 0, x: 250, y: 200 },
  },
  {
    id: 'layer-4',
    type: 'video',
    name: 'Hintergrund-Video',
    visible: false,
    locked: false,
    color: LAYER_COLORS.video,
    startFrame: 0,
    endFrame: 120,
    keyframes: [
      { id: 'kf-4a', time: 0, properties: { opacity: 50 }, easing: 'linear' },
    ],
    properties: { src: '/bg.mp4', opacity: 50, x: 960, y: 540, width: 1920, height: 1080 },
  },
];

export const mockProject: Project = {
  id: 'proj-001',
  name: 'Intro-Animation',
  width: 1920,
  height: 1080,
  fps: 30,
  totalFrames: 120,
  layers: mockLayers,
  currentFrame: 0,
};
