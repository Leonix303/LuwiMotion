import type { Layer, Keyframe, Easing } from '../types/project';

// ─── Easing-Funktionen ───────────────────────────────────────────────────────

function easingFn(easing: Easing, t: number): number {
  switch (easing) {
    case 'linear':
      return t;
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

// ─── Numerische Property-Interpolation ───────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Keyframe-Interpolation für eine einzelne Property ──────────────────────

export function interpolateProperty(
  keyframes: Keyframe[],
  frame: number,
  property: string,
  defaultValue: number
): number {
  // Keine Keyframes → Default
  if (keyframes.length === 0) return defaultValue;

  // Nur numerische Keyframes filtern
  const kfs = keyframes
    .filter((kf) => typeof kf.properties[property] === 'number')
    .sort((a, b) => a.time - b.time);

  if (kfs.length === 0) return defaultValue;

  // Vor dem ersten Keyframe → erster Wert
  if (frame <= kfs[0].time) return kfs[0].properties[property] as number;

  // Nach dem letzten Keyframe → letzter Wert
  if (frame >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].properties[property] as number;

  // Zwischen zwei Keyframes: finde die beiden umschließenden
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (frame >= a.time && frame <= b.time) {
      const duration = b.time - a.time;
      if (duration === 0) return a.properties[property] as number;
      const rawT = (frame - a.time) / duration;
      const easedT = easingFn(b.easing, rawT);
      return lerp(a.properties[property] as number, b.properties[property] as number, easedT);
    }
  }

  return defaultValue;
}

// ─── Berechnet alle animierten Properties für einen Layer zu einem Frame ────

export interface ComputedLayerProps {
  x: number;
  y: number;
  opacity: number;   // 0–100
  scale: number;     // 100 = normal
  rotation: number;  // Grad
  width: number;
  height: number;
  fontSize: number;
}

const DEFAULTS: ComputedLayerProps = {
  x: 0,
  y: 0,
  opacity: 100,
  scale: 100,
  rotation: 0,
  width: 200,
  height: 100,
  fontSize: 32,
};

export function computeLayerProps(layer: Layer, frame: number): ComputedLayerProps {
  const props = layer.properties;
  const kfs = layer.keyframes;

  const get = (key: keyof ComputedLayerProps) => {
    const def = (props[key] as number) ?? DEFAULTS[key];
    return interpolateProperty(kfs, frame, key, def);
  };

  return {
    x: get('x'),
    y: get('y'),
    opacity: get('opacity'),
    scale: get('scale'),
    rotation: get('rotation'),
    width: get('width'),
    height: get('height'),
    fontSize: get('fontSize'),
  };
}

// ─── Canvas-Renderer: Zeichnet einen Layer auf ein HTML5 Canvas ─────────────

export function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  frame: number,
  canvasWidth: number,
  canvasHeight: number
) {
  if (!layer.visible) return;
  if (frame < layer.startFrame || frame > layer.endFrame) return;

  const props = computeLayerProps(layer, frame);
  const alpha = Math.max(0, Math.min(1, props.opacity / 100));
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Translate zum Layer-Mittelpunkt
  const cx = props.x;
  const cy = props.y;
  ctx.translate(cx, cy);

  // Scale
  const s = props.scale / 100;
  ctx.scale(s, s);

  // Rotation
  if (props.rotation !== 0) {
    ctx.rotate((props.rotation * Math.PI) / 180);
  }

  const hw = props.width / 2;
  const hh = props.height / 2;

  switch (layer.type) {
    case 'text': {
      const text = String(layer.properties.text || layer.name);
      const fontSize = props.fontSize;
      const color = String(layer.properties.color || '#ffffff');
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      break;
    }
    case 'shape': {
      const fill = String(layer.properties.fill || layer.color);
      const shapeType = String(layer.properties.shape || 'rectangle');
      ctx.fillStyle = fill;
      if (shapeType === 'ellipse' || shapeType === 'circle') {
        ctx.beginPath();
        ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // rectangle (default)
        ctx.fillRect(-hw, -hh, props.width, props.height);
      }
      break;
    }
    case 'image': {
      // Fallback: Gradient-Box (echte Bilder kommen per Tauri IPC)
      const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(1, '#ec4899');
      ctx.fillStyle = grad;
      ctx.fillRect(-hw, -hh, props.width, props.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🖼', 0, 0);
      break;
    }
    case 'video': {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-hw, -hh, props.width, props.height);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(-hw, -hh, props.width, props.height);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▶ Video', 0, 0);
      break;
    }
  }

  ctx.restore();
}

// ─── Gesamter Frame rendern ─────────────────────────────────────────────────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  frame: number,
  canvasWidth: number,
  canvasHeight: number,
  bgColor = '#111111'
) {
  // Hintergrund
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Layer von unten nach oben zeichnen (erste im Array = unten)
  for (const layer of layers) {
    drawLayer(ctx, layer, frame, canvasWidth, canvasHeight);
  }
}
