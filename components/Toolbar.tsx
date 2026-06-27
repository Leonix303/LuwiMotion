'use client';

import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';

export default function Toolbar() {
  const {
    activeTool, setActiveTool, width, height, fps, setProjectSettings,
    requestExport, isExporting, exportProgress, exportDone, exportFileName, resetExport,
  } = useProjectStore();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 'p' || e.key === 'P') setActiveTool('pen');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setActiveTool]);

  const resolutions = [
    { label: '1080p', w: 1920, h: 1080 },
    { label: '720p', w: 1280, h: 720 },
    { label: '4K', w: 3840, h: 2160 },
    { label: '1:1', w: 1080, h: 1080 },
    { label: '9:16', w: 1080, h: 1920 },
  ];

  return (
    <header
      className="flex items-center justify-between px-3 h-11 shrink-0"
      style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Links: Logo */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold ai-text tracking-wide">LuwiMotion</span>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
          BETA
        </span>
      </div>

      {/* Mitte: Tools */}
      <div className="flex items-center gap-1">
        {([
          { id: 'select' as const, icon: '↖', label: 'Auswahl (V)', shortcut: 'V' },
          { id: 'hand' as const, icon: '✋', label: 'Hand (H)', shortcut: 'H' },
          { id: 'pen' as const, icon: '✏', label: 'Stift (P)', shortcut: 'P' },
        ]).map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => setActiveTool(tool.id)}
            className={`w-8 h-7 flex items-center justify-center rounded text-xs cursor-pointer transition-colors ${
              activeTool === tool.id ? 'tool-btn-active' : ''
            }`}
            style={{
              background: activeTool === tool.id ? undefined : 'transparent',
              color: activeTool === tool.id ? undefined : 'var(--text-secondary)',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (activeTool !== tool.id) (e.currentTarget.style.background = 'var(--border)');
            }}
            onMouseLeave={(e) => {
              if (activeTool !== tool.id) (e.currentTarget.style.background = 'transparent');
            }}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Rechts: Canvas-Settings + Export */}
      <div className="flex items-center gap-2">
        {/* Auflösung */}
        <select
          className="text-xs px-2 py-1 rounded cursor-pointer"
          style={{ background: 'var(--border)', color: 'var(--text-primary)', border: 'none', outline: 'none' }}
          value={`${width}x${height}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            setProjectSettings({ width: w, height: h });
          }}
        >
          {resolutions.map((r) => (
            <option key={r.label} value={`${r.w}x${r.h}`}>
              {r.label} ({r.w}×{r.h})
            </option>
          ))}
        </select>

        {/* FPS */}
        <select
          className="text-xs px-2 py-1 rounded cursor-pointer"
          style={{ background: 'var(--border)', color: 'var(--text-primary)', border: 'none', outline: 'none' }}
          value={fps}
          onChange={(e) => setProjectSettings({ fps: Number(e.target.value) })}
        >
          {[24, 25, 30, 60].map((f) => (
            <option key={f} value={f}>{f} FPS</option>
          ))}
        </select>

        {/* Export Button */}
        <div className="relative">
          <button
            className="px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors"
            style={{
              background: isExporting ? 'var(--border)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              opacity: isExporting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!isExporting) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { if (!isExporting) e.currentTarget.style.background = 'var(--accent)'; }}
            onClick={() => !isExporting && requestExport()}
            disabled={isExporting}
          >
            {isExporting ? `${exportProgress}%` : exportDone ? '✓ Exportiert' : 'Export'}
          </button>

          {/* Export-Done Toast */}
          {exportDone && (
            <div
              className="absolute top-full right-0 mt-1 px-3 py-2 rounded text-xs shadow-lg z-50"
              style={{ background: '#1f1f1f', border: '1px solid var(--border)', color: 'var(--text-primary)', minWidth: 200 }}
            >
              <div className="font-semibold mb-1" style={{ color: '#22c55e' }}>✓ Video gespeichert</div>
              <div style={{ color: 'var(--text-muted)' }}>{exportFileName}</div>
              <button
                className="mt-1 text-xs underline cursor-pointer"
                style={{ color: 'var(--accent)', background: 'none', border: 'none' }}
                onClick={resetExport}
              >
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
