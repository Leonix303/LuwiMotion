'use client';

import { useProjectStore } from '../store/projectStore';

export default function LayerPanel() {
  const { layers, selectedLayerId, selectLayer, toggleLayerVisibility, toggleLayerLock } = useProjectStore();

  const typeLabels: Record<string, string> = {
    text: 'T',
    shape: 'S',
    image: 'I',
    video: 'V',
  };

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 220,
        background: 'var(--panel-bg)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          LAYER
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {layers.length}
        </span>
      </div>

      {/* Layer-Liste */}
      <div className="flex-1 overflow-y-auto">
        {layers.map((layer, idx) => {
          const isSelected = layer.id === selectedLayerId;
          return (
            <div
              key={layer.id}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors"
              style={{
                background: isSelected ? 'var(--selection)' : idx % 2 === 0 ? 'var(--panel-bg)' : 'var(--panel-bg-alt)',
                borderLeft: `3px solid ${layer.color}`,
              }}
              onClick={() => selectLayer(layer.id)}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'var(--border)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? 'var(--panel-bg)' : 'var(--panel-bg-alt)';
              }}
            >
              {/* Typ-Badge */}
              <span
                className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold shrink-0"
                style={{ background: layer.color + '33', color: layer.color }}
              >
                {typeLabels[layer.type]}
              </span>

              {/* Name */}
              <span
                className="flex-1 text-xs truncate"
                style={{ color: layer.visible ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {layer.name}
              </span>

              {/* Icons */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Sichtbarkeit */}
                <button
                  className="w-5 h-5 flex items-center justify-center rounded cursor-pointer text-xs"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: layer.visible ? 'var(--text-secondary)' : 'var(--text-muted)',
                    opacity: layer.visible ? 1 : 0.4,
                  }}
                  title={layer.visible ? 'Ausblenden' : 'Einblenden'}
                  onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                >
                  {layer.visible ? '👁' : '👁'}
                </button>

                {/* Lock */}
                <button
                  className="w-5 h-5 flex items-center justify-center rounded cursor-pointer text-xs"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: layer.locked ? 'var(--accent)' : 'var(--text-muted)',
                    opacity: layer.locked ? 1 : 0.4,
                  }}
                  title={layer.locked ? 'Entsperren' : 'Sperren'}
                  onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id); }}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
          );
        })}

        {layers.length === 0 && (
          <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Keine Layer vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}
