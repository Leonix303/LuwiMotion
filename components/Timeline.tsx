'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import TimelineTrack from './TimelineTrack';

export default function Timeline() {
  const {
    layers,
    totalFrames,
    fps,
    currentFrame,
    setCurrentFrame,
    selectedLayerId,
    selectLayer,
    isPlaying,
    togglePlayback,
    zoomLevel,
    setZoomLevel,
  } = useProjectStore();

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Playback-Animation
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    let lastTime = performance.now();
    function tick(now: number) {
      const delta = now - lastTime;
      const frameDuration = 1000 / fps;
      if (delta >= frameDuration) {
        const store = useProjectStore.getState();
        const next = store.currentFrame + 1;
        if (next >= store.totalFrames) {
          store.setCurrentFrame(0);
        } else {
          store.setCurrentFrame(next);
        }
        lastTime = now;
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, fps]);

  // Frame aus Klick-Position berechnen
  const frameFromEvent = useCallback(
    (clientX: number) => {
      if (!trackAreaRef.current) return currentFrame;
      const rect = trackAreaRef.current.getBoundingClientRect();
      const x = clientX - rect.left + trackAreaRef.current.scrollLeft;
      const totalWidth = rect.width * zoomLevel;
      const frame = Math.round((x / totalWidth) * totalFrames);
      return Math.max(0, Math.min(frame, totalFrames - 1));
    },
    [totalFrames, zoomLevel, currentFrame]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setCurrentFrame(frameFromEvent(e.clientX));
    },
    [frameFromEvent, setCurrentFrame]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setCurrentFrame(frameFromEvent(e.clientX));
    },
    [isDragging, frameFromEvent, setCurrentFrame]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zeit-Markierungen
  const markers = [];
  const step = Math.max(1, Math.round(10 / zoomLevel));
  for (let f = 0; f <= totalFrames; f += step) {
    const percent = (f / totalFrames) * 100;
    markers.push(
      <div
        key={f}
        className="absolute top-0 flex flex-col items-center"
        style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 9 }}>
          {f}
        </span>
        <div style={{ width: 1, height: 6, background: 'var(--border)', marginTop: 1 }} />
      </div>
    );
  }

  const playheadPercent = (currentFrame / totalFrames) * 100;
  const timeStr = `${Math.floor(currentFrame / fps)}:${String(currentFrame % fps).padStart(2, '0')}`;

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        height: 220,
        background: 'var(--panel-bg)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Transport-Controls + Zoom */}
      <div
        className="flex items-center justify-between px-3 py-1.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Links: Transport */}
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 flex items-center justify-center rounded text-xs cursor-pointer"
            style={{ background: 'var(--border)', color: 'var(--text-primary)', border: 'none' }}
            title="An den Anfang"
            onClick={() => setCurrentFrame(0)}
          >
            ⏮
          </button>
          <button
            className="w-8 h-7 flex items-center justify-center rounded text-sm cursor-pointer"
            style={{
              background: isPlaying ? 'var(--accent)' : 'var(--border)',
              color: isPlaying ? '#fff' : 'var(--text-primary)',
              border: 'none',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={togglePlayback}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded text-xs cursor-pointer"
            style={{ background: 'var(--border)', color: 'var(--text-primary)', border: 'none' }}
            title="Ans Ende"
            onClick={() => setCurrentFrame(totalFrames - 1)}
          >
            ⏭
          </button>

          {/* Frame-Anzeige */}
          <div
            className="ml-2 px-2 py-1 rounded text-xs font-mono"
            style={{ background: 'var(--panel-bg-alt)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            {currentFrame} / {totalFrames}
            <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
              ({timeStr})
            </span>
          </div>
        </div>

        {/* Rechts: Zoom */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Zoom
          </span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.25}
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-20"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-xs w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>

      {/* Timeline-Bereich */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Zeit-Leiste mit Tracks */}
        <div className="flex-1 flex flex-col overflow-auto" ref={trackAreaRef}>
          {/* Zeit-Markierungen */}
          <div
            className="relative shrink-0"
            style={{
              height: 20,
              borderBottom: '1px solid var(--border)',
              minWidth: `${100 * zoomLevel}%`,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {markers}
          </div>

          {/* Tracks */}
          <div
            className="relative flex-1"
            style={{ minWidth: `${100 * zoomLevel}%` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {layers.map((layer) => (
              <TimelineTrack
                key={layer.id}
                layer={layer}
                totalFrames={totalFrames}
                isSelected={layer.id === selectedLayerId}
                onSelect={() => selectLayer(layer.id)}
              />
            ))}

            {/* Playhead */}
            <div
              className="playhead absolute top-0 bottom-0 pointer-events-none"
              style={{ left: `${playheadPercent}%`, zIndex: 50 }}
            >
              {/* Playhead-Kopf */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '7px solid var(--playhead)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
