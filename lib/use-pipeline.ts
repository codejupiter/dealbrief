/**
 * lib/use-pipeline.ts
 *
 * Custom hook that opens a streaming connection to /api/pipeline and routes
 * events into UI state. Encapsulates all the streaming complexity so the
 * page component stays simple.
 *
 * Design decisions:
 *
 * 1. Uses fetch + ReadableStream rather than EventSource. EventSource is the
 *    "standard" way to consume SSE but doesn't support POST requests — and we
 *    need POST because the transcript can be too long for a URL parameter.
 *    Manual parsing of the SSE format is the price of using POST.
 *
 * 2. Buffer pattern for SSE parsing: chunks from the network may split events,
 *    or contain multiple events. We accumulate into a buffer, find complete
 *    events by splitting on the SSE delimiter (\n\n), process them, and keep
 *    the partial trailing chunk for the next read.
 *
 * 3. We use AbortController so the user could cancel mid-pipeline. Not exposed
 *    in v1 UI but available — useful when we add a "Stop" button later.
 *
 * 4. Errors surface through the same callback as success events. The caller
 *    decides how to render error states.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { STEP_META, type StepId, type StepState } from './pipeline-types';

const INITIAL_STEPS: Record<StepId, StepState> = {
  extract:    { status: 'idle', latencyMs: null, tokens: null },
  classify:   { status: 'idle', latencyMs: null, tokens: null },
  crossref:   { status: 'idle', latencyMs: null, tokens: null },
  compliance: { status: 'idle', latencyMs: null, tokens: null },
  synthesize: { status: 'idle', latencyMs: null, tokens: null },
};

type ServerEvent =
  | { type: 'step_start'; step: StepId; timestamp: number }
  | { type: 'step_complete'; step: StepId; latency_ms: number; tokens: number }
  | { type: 'step_error'; step: StepId; error: string }
  | { type: 'brief_token'; token: string }
  | { type: 'pipeline_complete'; total_latency_ms: number; total_tokens: number }
  | { type: 'pipeline_error'; error: string };

export function usePipeline() {
  const [steps, setSteps] = useState<Record<StepId, StepState>>(INITIAL_STEPS);
  const [brief, setBrief] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ latency: number; tokens: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS);
    setBrief('');
    setIsRunning(false);
    setError(null);
    setTotals(null);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  }, []);

  const run = useCallback(async (transcript: string) => {
    // Fresh start
    setSteps(INITIAL_STEPS);
    setBrief('');
    setError(null);
    setTotals(null);
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Pipeline failed: ${response.status} ${message}`);
      }
      if (!response.body) {
        throw new Error('No response body from pipeline.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by blank lines. Split, process all complete
        // events, keep the trailing partial event in the buffer.
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          // Each event line starts with "data: ". Ignore comments and other
          // SSE fields we don't use.
          const dataLine = part
            .split('\n')
            .find((line) => line.startsWith('data: '));
          if (!dataLine) continue;

          const json = dataLine.slice(6); // strip "data: "
          let event: ServerEvent;
          try {
            event = JSON.parse(json) as ServerEvent;
          } catch {
            continue; // ignore malformed events rather than crashing the UI
          }

          handleEvent(event);
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled — leave state as-is.
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }

    function handleEvent(event: ServerEvent) {
      switch (event.type) {
        case 'step_start':
          setSteps((prev) => ({
            ...prev,
            [event.step]: { ...prev[event.step], status: 'running' },
          }));
          return;

        case 'step_complete':
          setSteps((prev) => ({
            ...prev,
            [event.step]: {
              status: 'complete',
              latencyMs: event.latency_ms,
              tokens: event.tokens,
            },
          }));
          return;

        case 'step_error':
          setSteps((prev) => ({
            ...prev,
            [event.step]: {
              ...prev[event.step],
              status: 'error',
              error: event.error,
            },
          }));
          return;

        case 'brief_token':
          setBrief((prev) => prev + event.token);
          return;

        case 'pipeline_complete':
          setTotals({
            latency: event.total_latency_ms,
            tokens: event.total_tokens,
          });
          return;

        case 'pipeline_error':
          setError(event.error);
          return;
      }
    }
  }, []);

  return { steps, brief, isRunning, error, totals, run, stop, reset };
}

// Re-export for convenience
export { STEP_META };
