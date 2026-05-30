/**
 * app/api/pipeline/route.ts
 *
 * The production pipeline endpoint. Replaces the test routes.
 *
 * This route streams TWO kinds of events back to the client over a single
 * HTTP connection:
 *
 *   1. Step events — JSON objects like { type: 'step_complete', step: 'extract',
 *      latency_ms: 4200, tokens: 2940, output: {...} }. The UI uses these to
 *      drive the pipeline card states.
 *
 *   2. Brief tokens — the streaming markdown output from the synthesis step,
 *      sent as a series of token events.
 *
 * Implementation approach: we use Server-Sent Events (SSE) format. Each event
 * is a single line of JSON prefixed with `data: ` and separated by blank lines.
 * The client reads them with the browser's native ReadableStream API. We don't
 * use the Vercel AI SDK's data stream protocol here because it's optimized for
 * chat UIs and adds protocol overhead we don't need; SSE is simpler and the
 * client code is more explicit.
 *
 * Design notes:
 *
 * - Each step runs sequentially in v1. Extract and compliance COULD run in
 *   parallel (no dependency between them) — that's noted as v2 work.
 *
 * - We emit step_start AND step_complete events so the UI can show running
 *   states with real latency, not estimated.
 *
 * - The transcript comes from POST body, not URL params. URLs have length
 *   limits and would leak transcripts into server logs.
 *
 * - We don't validate the transcript heavily — the client checks length before
 *   sending. Server-side abuse prevention would be a v2 concern (rate limiting,
 *   max length cap).
 */

import { runExtract } from '@/lib/steps/extract';
import { runClassify } from '@/lib/steps/classify';
import { runCrossref } from '@/lib/steps/crossref';
import { runCompliance } from '@/lib/steps/compliance';
import { runSynthesize } from '@/lib/steps/synthesize';

export const runtime = 'nodejs';
export const maxDuration = 90; // Pipeline can take up to ~30s; give headroom.

// Event types matching the client's PipelineEvent union.
type Event =
  | { type: 'step_start'; step: string; timestamp: number }
  | { type: 'step_complete'; step: string; latency_ms: number; tokens: number; output?: unknown }
  | { type: 'step_error'; step: string; error: string }
  | { type: 'brief_token'; token: string }
  | { type: 'pipeline_complete'; total_latency_ms: number; total_tokens: number }
  | { type: 'pipeline_error'; error: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const transcript: string | undefined = body?.transcript;

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 50) {
    return new Response(
      JSON.stringify({ error: 'Transcript must be a string of at least 50 characters.' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Event) => {
        const line = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      const runStep = async <T>(
        stepId: string,
        fn: () => Promise<{ output: T; tokens: number }>,
      ): Promise<T | null> => {
        const start = Date.now();
        send({ type: 'step_start', step: stepId, timestamp: start });
        try {
          const result = await fn();
          send({
            type: 'step_complete',
            step: stepId,
            latency_ms: Date.now() - start,
            tokens: result.tokens,
          });
          return result.output;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          send({ type: 'step_error', step: stepId, error: message });
          return null;
        }
      };

      const pipelineStart = Date.now();
      let totalTokens = 0;

      try {
        // Step 1
        const extracted = await runStep('extract', () => runExtract(transcript));
        if (!extracted) return;

        // Step 2
        const classified = await runStep('classify', () =>
          runClassify(transcript, extracted),
        );
        if (!classified) return;

        // Step 3
        const crossref = await runStep('crossref', () => runCrossref(classified));
        if (!crossref) return;

        // Step 4
        const compliance = await runStep('compliance', () => runCompliance(transcript));
        if (!compliance) return;

        // Step 5 — streaming synthesis. Tokens are forwarded to the client
        // as brief_token events; step_complete fires after the stream ends.
        const synthStart = Date.now();
        send({ type: 'step_start', step: 'synthesize', timestamp: synthStart });

        const synthResult = await runSynthesize({
          transcript,
          extracted,
          classified,
          crossref,
          compliance,
        });

        // Pipe tokens to the client as they arrive.
        let synthTokenCount = 0;
        for await (const delta of synthResult.textStream) {
          send({ type: 'brief_token', token: delta });
        }

        // After the stream resolves we can get final usage info.
        const usage = await synthResult.usage;
        synthTokenCount = usage.totalTokens ?? 0;

        send({
          type: 'step_complete',
          step: 'synthesize',
          latency_ms: Date.now() - synthStart,
          tokens: synthTokenCount,
        });

        totalTokens += synthTokenCount;

        send({
          type: 'pipeline_complete',
          total_latency_ms: Date.now() - pipelineStart,
          total_tokens: totalTokens,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown pipeline error';
        send({ type: 'pipeline_error', error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no', // Disable nginx-style buffering if deployed behind a proxy.
    },
  });
}
