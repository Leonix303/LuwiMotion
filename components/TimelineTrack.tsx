'use client';

import type { Layer } from '../types/project';
import KeyframeDiamond from './Keyframe';

interface TimelineTrackProps {
  layer: Layer;
  totalFrames: number;
  isSelected: boolean;
  onSelect: () => void;
}

export default function TimelineTrack({ layer, totalFrames, isSelected, onSelect }: TimelineTrackProps) {
  const clipStartPercent = (layer.startFrame / totalFrames) * 100;
  const clipWidthPercent = ((layer.endFrame - layer.startFrame) / totalFrames) * 100;

  return (
    <div
      className="relative flex items-center cursor-pointer transition-colors"
      style={{
        height: 28,
        background: isSelected ? 'var(--selection)' : 'transparent',
        borderBottom: '1px solid var(--border)',
      }}
      onClick={onSelect}
    >
      {/* Layer-Name (klein, links überlappt) */}
      <div
        className="absolute left-1 z-10 text-xs truncate"
        style={{
          color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
          maxWidth: 90,
          fontSize: 10,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        {layer.name}
      </div>

      {/* Clip-Balken */}
      <div
        className="absolute rounded-sm"
        style={{
          left: `${clipStartPercent}%`,
          width: `${clipWidthPercent}%`,
          height: 18,
          top: '50%',
          transform: 'translateY(-50%)',
          background: layer.color + '44',
          border: `1px solid ${layer.color}88`,
          minWidth: 8,
        }}
      />

      {/* Keyframes */}
      {layer.keyframes.map((kf) => (
        <KeyframeDiamond
          key={kf.id}
          keyframe={kf}
          layerColor={layer.color}
          totalFrames={totalFrames}
          trackWidth={0}
        />
      ))}
    </div>
  );
}
