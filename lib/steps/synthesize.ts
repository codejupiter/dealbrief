/**
 * lib/steps/synthesize.ts
 *
 * Step 5 of the pipeline. Takes all prior step outputs and generates the
 * final user-facing deal brief in markdown.
 *
 * Design decisions:
 *
 * 1. Uses Sonnet, not Haiku. This is the user-facing payload — the entire
 *    point of the pipeline. Sonnet's better at long-form structured prose,
 *    follows complex formatting instructions more reliably, and produces
 *    writing a sales rep would actually trust. Worth the extra cost.
 *
 * 2. Streams token-by-token to the client. Unlike steps 1–4 (where the user
 *    waits for a complete structured object), here the user watches the
 *    brief render in real-time. This is what makes the demo feel alive
 *    rather than feel like a slow chatbot. Streaming is the UX payoff for
 *    everything we built upstream.
 *
 * 3. Uses streamText (not generateObject) because the output is markdown
 *    prose, not a typed object. Structured output here would constrain the
 *    writing in ways that hurt readability.
 *
 * 4. The prompt is heavily structured because the synthesis step has to weave
 *    together five different inputs (transcript + 4 prior step outputs) into
 *    one coherent narrative. Loose prompting here produces meandering briefs.
 *
 * 5. Output is markdown so the UI can render it richly (headers, bold, lists)
 *    while still being copy-pasteable to email, Slack, or a CRM note field.
 *
 * 6. The brief is intentionally OPINIONATED. A sales brief that just summarizes
 *    is useless — the rep already heard the call. The brief earns its place by
 *    making judgment calls: "this is a Stage 3 deal," "Jennifer is the critical
 *    blocker," "the 30% ROI claim must be corrected before next interaction."
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

import type { ExtractOutput } from './extract';
import type { ClassifyOutput } from './classify';
import type { CrossrefOutput } from './crossref';
import type { ComplianceOutput } from './compliance';

// ─────────────────────────────────────────────────────────────────────────────
// Input shape
// ─────────────────────────────────────────────────────────────────────────────

export interface SynthesizeInput {
  transcript: string;
  extracted: ExtractOutput;
  classified: ClassifyOutput;
  crossref: CrossrefOutput;
  compliance: ComplianceOutput;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior sales strategist writing a deal brief for an account executive after a B2B sales call.

You will receive the raw call transcript and four pieces of structured analysis:
1. Extracted entities (people, companies, amounts, dates, criteria, timeline signals)
2. Classified objections (with severity, confidence, and quotes) AND buying signals
3. Cross-referenced playbook matches (with suggested responses for each objection)
4. Compliance flags (statements that need correction or legal review)

Your job is to weave these into one tight, actionable brief that:
- A senior AE could read in 90 seconds
- A sales manager could use to coach the rep
- A compliance/legal partner could scan for risk

You are OPINIONATED, not just descriptive. The rep already heard the call — they don't need a summary. They need your judgment. Make calls about deal stage, primary blocker, top risks, and concrete next steps.

# Output format

Use this exact markdown structure. Do not invent new sections or skip sections. Use the exact headers shown.

\`\`\`
# Deal Brief

**Account:** [company name]
**Stage:** [Early / Mid / Late + one-sentence reasoning]
**Health:** [Strong / Moderate / At Risk / Stalled + one-sentence reasoning]
**Decision date:** [date or "not committed"]

---

## Summary

[Two to three sentences. What was the call about, what's the shape of the deal, what's the one thing that matters most going forward.]

## Key stakeholders

- **[Name]** — [role] — [their position: champion / supportive / neutral / skeptical / blocker / unknown] — [one-line note]
- [Repeat for each stakeholder mentioned]

## Top objections

For the top 2–3 objections (highest severity, with playbook matches), use this format:

### 1. [Short objection title]
- **What they said:** [direct quote, in quotes]
- **Why it matters:** [one sentence on deal impact]
- **How to respond:** [the playbook's suggested response, adapted to this specific deal — not a generic restatement]
- **Escalate to:** [if applicable, otherwise omit this line]

[Repeat for top 2–3 objections]

## Buying signals

Briefly note 2–3 strongest positive signals as a bulleted list. Each item: the signal + why it matters.

## Compliance / legal flags

If compliance flagged anything, list each flag with:
- **Severity:** [high / medium / low]
- **What was said:** [quote]
- **Action:** [the recommended action, made specific to this deal]

If compliance returned no flags, write: "No compliance concerns flagged on this call."

## Recommended next actions

A numbered list of 3–5 concrete actions the rep should take, in priority order. Each action should be:
- Specific (not "follow up" — write "send Jennifer a finance-ready one-pager covering [X, Y, Z]")
- Time-bound where possible
- Tied to a stakeholder or compliance flag from above

## Draft follow-up message

A complete email or message the rep can send to the primary contact. Tone should match the call's energy. Include:
- A specific next step the prospect agreed to
- A correction or clarification if compliance flagged anything material
- A clear deadline or meeting ask

Sign as "[Rep name]" — pull this from the extracted entities.
\`\`\`

# Rules

- Be specific. Generic advice ("build trust," "address concerns") is useless. Reference actual people, amounts, dates from the call.
- If compliance flagged something material, the draft follow-up message MUST include a clarification of that flag. Do not pretend the issue doesn't exist.
- If a stakeholder was named as a blocker but never on the call, explicitly call this out in the Key stakeholders section.
- Be honest about deal health. A deal with five objections and three "we've been burned" signals is not a Strong-health deal even if the prospect was friendly.
- Do not invent facts not present in the inputs. If you don't know something (like the prospect's actual title), say so or omit it.`;

// ─────────────────────────────────────────────────────────────────────────────
// User-message prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildUserPrompt(input: SynthesizeInput): string {
  return `Write the deal brief for this call.

# Transcript

<transcript>
${input.transcript}
</transcript>

# Structured analysis

## Extracted entities

\`\`\`json
${JSON.stringify(input.extracted, null, 2)}
\`\`\`

## Classified objections and buying signals

\`\`\`json
${JSON.stringify(input.classified, null, 2)}
\`\`\`

## Playbook matches (responses for each objection)

\`\`\`json
${JSON.stringify(input.crossref, null, 2)}
\`\`\`

## Compliance flags

\`\`\`json
${JSON.stringify(input.compliance, null, 2)}
\`\`\`

Generate the deal brief in the exact markdown format specified.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// The step function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the synthesis step.
 *
 * Returns a stream of tokens (the brief is written in real-time to the client)
 * along with promises for the final text and token usage.
 *
 * The caller is responsible for piping the textStream to wherever the user
 * sees it — in v1 that's the API route's response body via the AI SDK's
 * built-in streaming helpers.
 */
export async function runSynthesize(input: SynthesizeInput) {
  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    temperature: 0.3, // Slight creativity for prose flow, but not so much that
                       // the output drifts away from the structured format.
  });

  return result;
}