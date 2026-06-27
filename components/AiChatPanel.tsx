'use client';

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { AgentPlan } from '../types/project';

// Checkbox-Liste fuer Agent-Plan-Schritte
function PlanChecklist({ plan }: { plan: AgentPlan }) {
  const allDone = plan.steps.every((s) => s.done);
  return (
    <div className="mt-2 space-y-1">
      {plan.steps.map((step) => (
        <div
          key={step.id}
          className="flex items-start gap-1.5 text-xs py-0.5"
          style={{ color: step.done ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          {/* Checkbox-Icon */}
          <span
            className="shrink-0 mt-0.5 transition-colors"
            style={{
              color: step.done ? '#22c55e' : 'var(--text-muted)',
              fontSize: '12px',
              lineHeight: 1,
            }}
          >
            {step.done ? '☑' : '☐'}
          </span>
          {/* Beschreibung */}
          <span
            style={{
              textDecoration: step.done ? 'line-through' : 'none',
              opacity: step.done ? 0.6 : 1,
            }}
          >
            {step.description}
          </span>
        </div>
      ))}
      {/* Abschluss-Badge wenn alle Schritte erledigt */}
      {allDone && (
        <div
          className="mt-1.5 text-xs font-semibold px-2 py-0.5 rounded inline-block"
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          ✓ Plan abgeschlossen
        </div>
      )}
    </div>
  );
}

export default function AiChatPanel() {
  const { chatMessages, chatLoading, planExecuting, sendChatMessage } = useProjectStore();
  const isBusy = chatLoading || planExecuting;
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    setInput('');
    await sendChatMessage(trimmed);
  }

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 290,
        background: 'var(--panel-bg)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="ai-text text-sm font-semibold">✦</span>
        <span className="text-xs font-semibold ai-text">KI-Assistent</span>
      </div>

      {/* Chat-Verlauf */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-full rounded-lg px-3 py-2 text-xs leading-relaxed"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--border)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                wordBreak: 'break-word',
              }}
            >
              {msg.role === 'assistant' && (
                <span className="ai-text font-bold mr-1">✦</span>
              )}
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>
                  {line.startsWith('**') ? (
                    <strong>{line.replace(/\*\*/g, '')}</strong>
                  ) : (
                    line
                  )}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}

              {/* Agent-Plan als Checkbox-Liste */}
              {msg.plan && msg.plan.steps.length > 0 && (
                <PlanChecklist plan={msg.plan} />
              )}

              {/* Aktionen-Badges (Legacy) */}
              {!msg.plan && msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.actions.map((action, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        color: '#a855f7',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                      }}
                    >
                      {action.type === 'add_keyframe' && '◆ Keyframe'}
                      {action.type === 'create_layer' && '＋ Layer'}
                      {action.type === 'modify_layer' && '✎ Ändern'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {(chatLoading || planExecuting) && (
          <div className="flex justify-start">
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <span className="ai-text">✦</span>{planExecuting ? ' Plan wird ausgeführt' : ' Denke nach'}
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
      </div>

      {/* Eingabefeld */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Animation beschreiben…"
            disabled={isBusy}
            className="flex-1 text-xs px-3 py-2 rounded outline-none"
            style={{
              background: 'var(--panel-bg-alt)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="px-3 py-2 rounded text-xs font-semibold cursor-pointer transition-opacity"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              opacity: isBusy || !input.trim() ? 0.4 : 1,
            }}
          >
            ✦
          </button>
        </div>
      </form>
    </div>
  );
}
