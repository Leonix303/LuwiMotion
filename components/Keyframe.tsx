'use client';

import { useState } from 'react';
import type { Keyframe as KeyframeType } from '../types/project';

interface KeyframeProps {
  keyframe: KeyframeType;
  layerColor: string;
  totalFrames: number;
  trackWidth: number;
}

export default function KeyframeDiamond({ keyframe, layerColor, totalFrames, trackWidth }: KeyframeProps) {
  const [hovered, setHovered] = useState(false);
  const leftPercent = (keyframe.time / totalFrames) * 100;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{
        left: `${leftPercent}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: hovered ? 10 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Diamant */}
      <div
        className="keyframe-diamond cursor-pointer"
        style={{ background: layerColor }}
      />

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{
            background: '#000',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            zIndex: 100,
          }}
        >
          <div style={{ color: layerColor, fontWeight: 600 }}>Frame {keyframe.time}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            {keyframe.easing} · {Object.keys(keyframe.properties).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
