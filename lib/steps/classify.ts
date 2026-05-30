/**
 * lib/steps/classify.ts
 *
 * Step 2 of the pipeline. Reads the transcript and categorizes any
 * objections the prospect raised during the call.
 *
 * Design decisions:
 *
 * 1. Takes BOTH the raw transcript AND the extracted entities. The transcript
 *    is the source of truth for objections (you need the actual words). The
 *    extracted entities give the model useful context (who said what, when).
 *
 * 2. Uses a closed enum for categories. The model cannot invent new categories
 *    — it must pick from the set. This is what makes downstream steps (especially
 *    cross-reference) tractable. If we let the model freestyle category names,
 *    we'd never get reliable playbook matches.
 *
 * 3. Each objection requires a `quote` field — the literal text from the
 *    transcript. This is non-negotiable for two reasons:
 *      a) It forces the model to ground its classification in actual words,
 *         not vibes. Cuts hallucination dramatically.
 *      b) It makes the output debuggable — you can verify every classification
 *         against the source.
 *
 * 4. `confidence` is self-reported by the model. This is theater for now (no
 *    eval data backs it up) but it's useful for UI signal — low-confidence
 *    classifications can be styled differently.
 *
 * 5. Still uses Haiku. Classification is structured + bounded, no creative
 *    writing needed. Saves cost for synthesis.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

import type { ExtractOutput } from './extract';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ObjectionCategory = z.enum([
  'price',
  'timing',
  'technical',
  'political', // Internal stakeholder issues — wrong champion, missing buy-in
  'competitor',
  'trust', // Security, compliance, vendor risk concerns from the prospect
  'other',
]);

export const ClassifySchema = z.object({
  objections: z
    .array(
      z.object({
        category: ObjectionCategory,
        quote: z
          .string()
          .describe('The literal text from the transcript that surfaced this objection.'),
        summary: z
          .string()
          .describe('One sentence summary of the underlying concern, in neutral language.'),
        raised_by: z
          .string()
          .describe('Who raised it — usually the prospect, sometimes a named stakeholder.'),
        severity: z
          .enum(['low', 'medium', 'high'])
          .describe(
            'How blocking this objection is. High = will kill the deal if unresolved. Low = mild concern.',
          ),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('How confident you are this is a real objection vs. a passing comment.'),
      }),
    )
    .describe('All objections raised during the call. Empty array if none.'),

  buying_signals: z
    .array(
      z.object({
        quote: z.string().describe('The literal text showing buying intent.'),
        strength: z
          .enum(['weak', 'moderate', 'strong'])
          .describe('How clearly this signals intent to buy.'),
      }),
    )
    .describe('Statements indicating positive buying intent. Useful counterbalance to objections.'),
});

export type ClassifyOutput = z.infer<typeof ClassifySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a sales call analyst specializing in B2B deal qualification.

Your job is to identify objections raised by the prospect during the call. You also identify buying signals as a counterweight — a deal with three objections and zero buying signals is in different shape than a deal with three objections and five buying signals.

Categories of objections:
- price: The cost is too high, budget is constrained, or the value proposition is unclear at the stated price.
- timing: Wrong time to buy — existing contracts, internal priorities, fiscal year cycles.
- technical: Integration concerns, missing features, technical compatibility, performance.
- political: Internal stakeholder issues — missing decision-makers, champion isn't senior enough, conflicting priorities between departments.
- competitor: Comparing against a specific competitor or "we already use X".
- trust: Security, compliance, vendor stability, data residency, or "we've been burned before" concerns.
- other: Use sparingly — only if the objection genuinely doesn't fit the above.

Rules:
- Every objection must have a direct quote from the transcript. If you cannot quote it, do not include it.
- Distinguish objections from buying signals. "I want to see ROI" stated as a hurdle is an objection. "I want this in our budget next year" stated as intent is a signal.
- Severity is about deal impact, not emotional intensity. A calm "the price is over our budget" is high severity. A loud "this is annoying" might be low.
- Confidence below 0.6 means you're not sure this is a real objection. Use it honestly — false objections are worse than missed ones.
- If a stakeholder is mentioned by name as a blocker (e.g. "Jennifer in finance will push back"), the raised_by field should reflect that.`;

// ─────────────────────────────────────────────────────────────────────────────
// The step function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the classification step.
 *
 * Takes the transcript (source of truth) and the extracted entities (context).
 * Returns categorized objections + buying signals with token count.
 */
export async function runClassify(
  transcript: string,
  extracted: ExtractOutput,
): Promise<{ output: ClassifyOutput; tokens: number }> {
  const result = await generateObject({
    model: anthropic('claude-haiku-4-5'),
    schema: ClassifySchema,
    system: SYSTEM_PROMPT,
    prompt: `Analyze the following sales call transcript and classify objections and buying signals.

For context, here are the entities already extracted from this transcript:

<extracted_entities>
${JSON.stringify(extracted, null, 2)}
</extracted_entities>

<transcript>
${transcript}
</transcript>

Identify all objections raised by the prospect (and any named stakeholders mentioned as blockers), along with buying signals that indicate positive intent.`,
    maxRetries: 2,
    temperature: 0,
  });

  return {
    output: result.object,
    tokens: result.usage.totalTokens ?? 0,
  };
}