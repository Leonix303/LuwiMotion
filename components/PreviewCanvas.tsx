'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import { renderFrame } from '../lib/interpolation';

// ─── Canvas-Preview mit echtem Rendering ──────────────────────────────────────

export default function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCleanupRef = useRef<(() => void) | null>(null);

  const width = useProjectStore((s) => s.width);
  const height = useProjectStore((s) => s.height);
  const layers = useProjectStore((s) => s.layers);
  const currentFrame = useProjectStore((s) => s.currentFrame);
  const fps = useProjectStore((s) => s.fps);
  const totalFrames = useProjectStore((s) => s.totalFrames);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const setCurrentFrame = useProjectStore((s) => s.setCurrentFrame);
  const exportRequested = useProjectStore((s) => s.exportRequested);
  const isExporting = useProjectStore((s) => s.isExporting);
  const exportProgress = useProjectStore((s) => s.exportProgress);
  const setExportProgress = useProjectStore((s) => s.setExportProgress);
  const setExportDone = useProjectStore((s) => s.setExportDone);
  const resetExport = useProjectStore((s) => s.resetExport);

  // ── Frame auf Canvas rendern ──────────────────────────────────────────────
  const drawFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderFrame(ctx, layers, frame, width, height);
  }, [layers, width, height]);

  // ── Re-Rendering bei jeder Änderung ───────────────────────────────────────
  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame, drawFrame]);

  // ── Video-Export via MediaRecorder + Canvas-Stream (frame-genaue Aufnahme) ─
  useEffect(() => {
    if (!exportRequested) return;
    const canvas = canvasRef.current;
    if (!canvas) { resetExport(); return; }

    const ctxOrNull = canvas.getContext('2d');
    if (!ctxOrNull) { resetExport(); return; }
    const context: CanvasRenderingContext2D = ctxOrNull;

    // Playback stoppen, damit der Export-Loop allein rendert
    setIsPlaying(false);

    let stopped = false;

    // captureStream(0) = manuelle Frame-Kontrolle via requestFrame()
    const stream = canvas.captureStream(0);
    const videoTrack = stream.getVideoTracks()[0];

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      if (stopped) return;
      stopped = true;
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const fileName = `luwimotion-${Date.now()}.webm`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(fileName);
    };

    recorder.start();

    // Frames sequenziell rendern + manuell capturieren
    let frame = 0;

    function renderNext() {
      if (stopped) return;
      if (frame >= totalFrames) {
        if (recorder.state === 'recording') recorder.stop();
        return;
      }
      // Frame zeichnen
      renderFrame(context, layers, frame, width, height);
      setCurrentFrame(frame);
      // Frame manuell an den Stream senden (frame-genaue Aufnahme)
      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        videoTrack.requestFrame();
      }
      setExportProgress(Math.round(((frame + 1) / totalFrames) * 100));
      frame++;
      // Kurze Pause damit MediaRecorder den Frame verarbeiten kann
      setTimeout(renderNext, 30);
    }

    renderNext();

    exportCleanupRef.current = () => {
      stopped = true;
      if (recorder.state === 'recording') recorder.stop();
    };

    return () => {
      if (!stopped && recorder.state === 'recording') recorder.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportRequested]);

  const aspectRatio = width / height;

  return (
    <div
      className="flex-1 flex items-center justify-center overflow-hidden relative"
      style={{ background: '#0a0a0a' }}
    >
      {/* Letterbox */}
      <div
        className="relative"
        style={{
          aspectRatio: `${aspectRatio}`,
          maxWidth: '100%',
          maxHeight: '100%',
          background: '#111',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* Echtes HTML5-Canvas */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Canvas-Info Overlay */}
        <div
          className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded"
          style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--text-muted)' }}
        >
          {width} × {height} · {fps}fps
        </div>
        <div
          className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded"
          style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--text-muted)' }}
        >
          Frame {currentFrame} / {totalFrames - 1}
        </div>

        {/* Playback-Indikator */}
        {isPlaying && (
          <div
            className="absolute top-2 right-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
          >
            <span style={{ fontSize: 10 }}>●</span> PLAYING
          </div>
        )}

        {/* Export-Overlay */}
        {isExporting && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)' }}
          >
            <div className="text-white text-sm font-semibold mb-3">Exportiere Video…</div>
            <div className="w-48 h-2 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${exportProgress}%`,
                  background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                }}
              />
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {exportProgress}% – Frame {Math.round((exportProgress / 100) * totalFrames)} / {totalFrames}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
