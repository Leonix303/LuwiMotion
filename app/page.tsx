'use client';

import Toolbar from '../components/Toolbar';
import LayerPanel from '../components/LayerPanel';
import PreviewCanvas from '../components/PreviewCanvas';
import AiChatPanel from '../components/AiChatPanel';
import Timeline from '../components/Timeline';

export default function EditorPage() {
  return (
    <div className="h-screen w-screen flex flex-col" style={{ background: 'var(--editor-bg)' }}>
      {/* Oben: Toolbar */}
      <Toolbar />

      {/* Mitte: Panels + Canvas */}
      <div className="flex flex-1 min-h-0">
        {/* Links: LayerPanel */}
        <LayerPanel />

        {/* Mitte: PreviewCanvas */}
        <PreviewCanvas />

        {/* Rechts: AiChatPanel */}
        <AiChatPanel />
      </div>

      {/* Unten: Timeline */}
      <Timeline />
    </div>
  );
}
