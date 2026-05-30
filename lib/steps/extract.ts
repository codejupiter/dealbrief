/**
 * lib/steps/extract.ts
 *
 * Step 1 of the pipeline. Pulls structured entities from a raw transcript:
 * people, companies, dollar amounts, dates, products, decision criteria,
 * and timeline signals.
 *
 * Design decisions:
 *
 * 1. Uses `generateObject` (not `streamText`) because we need a complete,
 *    validated JSON object before the next step can run. Streaming partial
 *    JSON to the user here would be theater — they can't act on half-extracted
 *    entities, and the synthesis step is where streaming actually matters.
 *
 * 2. Schema validation with Zod. The model's output is parsed against the schema;
 *    if it returns malformed data, `generateObject` retries automatically (up to
 *    `maxRetries`). This is the difference between production-minded code and a
 *    demo: trusting LLM output is how you ship bugs.
 *
 * 3. Uses Haiku, not Sonnet. Extraction is a structured-output task where
 *    accuracy matters more than nuance. Haiku is ~5x cheaper and ~3x faster,
 *    and just as good at this kind of work. Sonnet is reserved for synthesis.
 *
 * 4. The system prompt is intentionally explicit about what counts as "extracted"
 *    vs "inferred". We want the model to pull what's actually said, not to make
 *    inferences. Inference is step 2's job (classification) and step 5's job
 *    (synthesis). Keeping each step's job small is what makes the pipeline
 *    debuggable.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Schema — also exported from lib/schemas.ts in the real codebase, inlined here
// for clarity in the sketch.
// ─────────────────────────────────────────────────────────────────────────────

export const ExtractSchema = z.object({
  people: z
    .array(
      z.object({
        name: z.string().describe('Full name as stated in the transcript'),
        role: z
          .string()
          .nullable()
          .describe('Job title or role, if stated. Null if not mentioned.'),
        company: z
          .string()
          .nullable()
          .describe('Company they work for, if stated. Null if not mentioned.'),
      }),
    )
    .describe('All people mentioned by name in the transcript.'),

  companies: z
    .array(z.string())
    .describe('All company names mentioned, including prospects, competitors, and vendors.'),

  amounts: z
    .array(
      z.object({
        value: z.string().describe('The amount as stated, e.g. "$48,000" or "twelve thousand"'),
        context: z
          .string()
          .describe('What this amount refers to, e.g. "annual contract value" or "discount offer"'),
      }),
    )
    .describe('Dollar amounts or numeric values discussed.'),

  dates: z
    .array(
      z.object({
        date_reference: z.string().describe('How the date was referenced, e.g. "end of Q1"'),
        context: z.string().describe('What this date refers to, e.g. "decision deadline"'),
      }),
    )
    .describe('Dates, deadlines, or time references mentioned.'),

  products: z
    .array(z.string())
    .describe('Product names mentioned — yours, competitors, or third-party tools in the stack.'),

  decision_criteria: z
    .array(z.string())
    .describe('Explicit criteria the prospect uses to evaluate, e.g. "must integrate with HubSpot".'),

  timeline_signals: z
    .array(
      z.object({
        signal: z.string().describe('The signal as stated.'),
        urgency: z.enum(['low', 'medium', 'high']),
      }),
    )
    .describe('Signals about the prospect\'s timeline or urgency.'),
});

export type ExtractOutput = z.infer<typeof ExtractSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an extraction specialist analyzing B2B sales call transcripts.

Your job is to pull EXPLICITLY STATED entities from the transcript. You are not a summarizer, you are not an analyst, you do not infer.

Rules:
- Only extract entities that are directly mentioned in the transcript.
- If a person's role or company isn't stated, set those fields to null. Do not guess.
- For amounts, capture the exact phrasing used ("forty-eight thousand", not "$48,000") unless a dollar sign is explicitly used.
- For decision criteria, extract only criteria the prospect (not the rep) raises.
- If a category has no entries, return an empty array. Do not invent entries to fill it.

Quality bar: a human reading the transcript should be able to verify every single entity you extract by pointing to a specific line. If you cannot point to the line, do not include it.`;

// ─────────────────────────────────────────────────────────────────────────────
// The step function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the extraction step against a raw transcript.
 *
 * Returns the parsed output and a token count for observability.
 * Throws on validation failure (orchestrator catches and emits step_error).
 */
export async function runExtract(
  transcript: string,
): Promise<{ output: ExtractOutput; tokens: number }> {
  const result = await generateObject({
    model: anthropic('claude-haiku-4-5'),
    schema: ExtractSchema,
    system: SYSTEM_PROMPT,
    prompt: `Extract structured entities from the following sales call transcript:\n\n<transcript>\n${transcript}\n</transcript>`,
    maxRetries: 2,
    temperature: 0, // Deterministic for extraction. We want repeatable output.
  });

  return {
    output: result.object,
    tokens: result.usage.totalTokens ?? 0,
  };
}
