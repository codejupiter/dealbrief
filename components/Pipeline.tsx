/**
 * components/Pipeline.tsx
 *
 * Right-top pane. Shows the 5 pipeline steps with their current state.
 * Each card lights up as the step transitions idle → running → complete.
 *
 * Visible BEFORE running so the user knows what the system will do. That's
 * the agentic claim made tangible — they see the orchestration up front.
 *
 * Updated for Phase 3: shows pipeline totals (total tokens, total latency)
 * in the footer once the pipeline completes.
 */

import { STEP_META, type StepId, type StepState, type StepStatus } from '@/lib/pipeline-types';

interface Props {
  steps: Record<StepId, StepState>;
  totals: { latency: number; tokens: number } | null;
  isRunning: boolean;
}

export function Pipeline({ steps, totals, isRunning }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden"
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
          Pipeline
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: 'hsl(var(--muted))' }}
        >
          5 steps · 4 LLM calls + 1 vector match
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
        {STEP_META.map((meta) => (
          <StepCard
            key={meta.id}
            number={meta.number}
            label={meta.label}
            description={meta.description}
            state={steps[meta.id]}
          />
        ))}
      </div>

      {/* Footer — pipeline totals once complete */}
      {(totals || isRunning) && (
        <div
          className="px-5 py-3 border-t flex items-center justify-between text-xs tabular-nums"
          style={{
            borderColor: 'hsl(var(--border))',
            background: 'hsl(var(--surface-elevated))',
            color: 'hsl(var(--muted))',
          }}
        >
          <span>
            {isRunning && !totals
              ? 'Pipeline running…'
              : totals
              ? 'Pipeline complete'
              : ''}
          </span>
          {totals && (
            <span>
              {formatNumber(totals.tokens)} tokens · {formatLatency(totals.latency)} total
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface StepCardProps {
  number: number;
  label: string;
  description: string;
  state: StepState;
}

function StepCard({ number, label, description, state }: StepCardProps) {
  return (
    <div
      className="px-5 py-3.5 flex items-center gap-4 transition-colors"
      style={{
        borderColor: 'hsl(var(--border))',
        background:
          state.status === 'running'
            ? 'hsla(var(--accent-muted), 0.3)'
            : 'transparent',
      }}
    >
      <StatusIndicator status={state.status} number={number} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{
              color:
                state.status === 'complete'
                  ? 'hsl(var(--foreground))'
                  : state.status === 'running'
                  ? 'hsl(var(--accent-strong))'
                  : state.status === 'error'
                  ? 'hsl(var(--danger))'
                  : 'hsl(var(--muted-strong))',
            }}
          >
            {label}
          </span>
          {state.error && (
            <span className="text-xs" style={{ color: 'hsl(var(--danger))' }}>
              {state.error}
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted))' }}>
          {description}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs tabular-nums" style={{ color: 'hsl(var(--muted))' }}>
        {state.tokens !== null && state.tokens > 0 && (
          <span>{formatNumber(state.tokens)} tok</span>
        )}
        {state.latencyMs !== null && (
          <span>{formatLatency(state.latencyMs)}</span>
        )}
      </div>
    </div>
  );
}

function StatusIndicator({ status, number }: { status: StepStatus; number: number }) {
  const base =
    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums shrink-0';

  switch (status) {
    case 'idle':
      return (
        <div
          className={base}
          style={{
            background: 'hsl(var(--surface-elevated))',
            color: 'hsl(var(--muted))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          {number}
        </div>
      );
    case 'running':
      return (
        <div
          className={`${base} relative`}
          style={{
            background: 'hsl(var(--accent))',
            color: 'hsl(var(--background))',
            boxShadow: '0 0 16px -2px hsla(var(--accent), 0.6)',
          }}
        >
          <span className="animate-pulse">{number}</span>
        </div>
      );
    case 'complete':
      return (
        <div
          className={base}
          style={{
            background: 'hsla(var(--success), 0.15)',
            color: 'hsl(var(--success))',
            border: '1px solid hsla(var(--success), 0.3)',
          }}
        >
          ✓
        </div>
      );
    case 'error':
      return (
        <div
          className={base}
          style={{
            background: 'hsla(var(--danger), 0.15)',
            color: 'hsl(var(--danger))',
            border: '1px solid hsla(var(--danger), 0.3)',
          }}
        >
          !
        </div>
      );
  }
}

function formatNumber(n: number): string {
  if (n < 1000) return n.toString();
  return `${(n / 1000).toFixed(1)}k`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
