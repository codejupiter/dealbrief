/**
 * components/Brief.tsx
 *
 * Right-bottom pane. Renders the streaming markdown brief.
 *
 * Uses react-markdown for rendering. The streaming content updates the same
 * component on every token, so re-render performance matters — react-markdown
 * handles incremental rendering well.
 *
 * Empty state shows what the brief will contain, so users understand the
 * output before they run anything.
 */

import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
  isRunning: boolean;
}

export function Brief({ content, isRunning }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col flex-1 min-h-0"
      style={{
        background: 'hsl(var(--surface))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div
        className="px-5 py-3.5 border-b flex items-center justify-between"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'hsl(var(--muted))' }}
        >
          Brief
        </span>
        {content.length > 0 && !isRunning && (
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined') {
                void navigator.clipboard.writeText(content);
              }
            }}
            className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
            style={{
              background: 'hsl(var(--surface-elevated))',
              color: 'hsl(var(--muted-strong))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            Copy markdown
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 min-h-[320px]">
        {content.length === 0 ? <EmptyState /> : (
          <div className="prose-brief">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-10">
      <div
        className="text-sm mb-3"
        style={{ color: 'hsl(var(--muted-strong))' }}
      >
        The deal brief will appear here.
      </div>
      <div
        className="text-xs max-w-sm leading-relaxed"
        style={{ color: 'hsl(var(--muted))' }}
      >
        Deal summary, stage assessment, top objections with playbook responses,
        compliance flags, recommended next actions, and a draft follow-up
        message — written by Claude based on the structured pipeline output.
      </div>
    </div>
  );
}
