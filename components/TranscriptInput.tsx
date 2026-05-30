/**
 * components/TranscriptInput.tsx
 *
 * Left pane. Sample dropdown, transcript textarea, generate/reset actions.
 *
 * Updated layout: the container is height-constrained by its parent (sticky
 * section), and the textarea fills the available space with internal scroll.
 * This keeps the left column locked to viewport height regardless of
 * transcript length.
 */

'use client';

import { useState } from 'react';
import type { Sample } from '@/lib/samples';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onLoadSample: (id: string) => void;
  onGenerate: () => void;
  onReset: () => void;
  isRunning: boolean;
  samples: Sample[];
}

export function TranscriptInput({
  value,
  onChange,
  onLoadSample,
  onGenerate,
  onReset,
  isRunning,
  samples,
}: Props) {
  const [showSamples, setShowSamples] = useState(false);

  const canGenerate = value.trim().length > 50 && !isRunning;

  return (
    <div
      className="rounded-lg flex flex-col flex-1 min-h-0 overflow-hidden"
      style={{
        background: 'hsl(var(--surface))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'hsl(var(--muted))' }}
          >
            Transcript
          </span>
          {value.trim().length > 0 && (
            <span
              className="text-[10px] tabular-nums"
              style={{ color: 'hsl(var(--muted))' }}
            >
              · {value.trim().split(/\s+/).length} words
            </span>
          )}
        </div>

        {/* Sample loader */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSamples((s) => !s)}
            disabled={isRunning}
            className="text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            style={{
              background: 'hsl(var(--surface-elevated))',
              color: 'hsl(var(--muted-strong))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            Load sample ▾
          </button>
          {showSamples && (
            <div
              className="absolute right-0 top-full mt-1.5 w-72 rounded-md overflow-hidden z-10 shadow-2xl"
              style={{
                background: 'hsl(var(--surface-elevated))',
                border: '1px solid hsl(var(--border-strong))',
              }}
            >
              {samples.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    onLoadSample(sample.id);
                    setShowSamples(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:opacity-80 transition-opacity block"
                  style={{
                    borderBottom: '1px solid hsl(var(--border))',
                  }}
                >
                  <div
                    className="text-sm font-medium"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {sample.label}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: 'hsl(var(--muted))' }}
                  >
                    {sample.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Textarea — fills remaining space, scrolls internally */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isRunning}
        placeholder="Paste a sales call transcript here, or load a sample from the dropdown above."
        className="flex-1 w-full px-5 py-4 bg-transparent resize-none outline-none text-sm leading-relaxed font-mono disabled:opacity-60 min-h-0"
        style={{
          color: 'hsl(var(--foreground))',
        }}
      />

      {/* Footer / Actions */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-t gap-3 shrink-0"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <button
          type="button"
          onClick={onReset}
          disabled={isRunning || value.length === 0}
          className="text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-30"
          style={{ color: 'hsl(var(--muted))' }}
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="text-sm font-medium px-5 py-2 rounded-md transition-all disabled:cursor-not-allowed"
          style={{
            background: canGenerate ? 'hsl(var(--accent))' : 'hsl(var(--surface-elevated))',
            color: canGenerate ? 'hsl(var(--background))' : 'hsl(var(--muted))',
            boxShadow: canGenerate
              ? '0 0 24px -4px hsla(var(--accent), 0.4)'
              : 'none',
          }}
        >
          {isRunning ? 'Running pipeline…' : 'Generate brief →'}
        </button>
      </div>
    </div>
  );
}
