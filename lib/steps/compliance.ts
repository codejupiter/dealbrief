/**
 * lib/steps/compliance.ts
 *
 * Step 4 of the pipeline. Scans the transcript for statements that could
 * create regulatory, legal, or trust exposure.
 *
 * Design decisions:
 *
 * 1. CONSERVATIVE BY DESIGN. False positives are cheap (rep gets a flag they
 *    ignore). False negatives are expensive (compliance issue ships to the
 *    customer or auditor). The prompt explicitly biases toward flagging.
 *
 * 2. Operates ONLY on the raw transcript. Unlike classify, this step does not
 *    receive the extracted entities as context. The reason: compliance issues
 *    often hide in the rep's wording, not in extracted "facts." Extraction
 *    might miss a borderline ROI claim because it doesn't fit a category;
 *    compliance needs to see the raw words.
 *
 * 3. Each flag requires a direct quote AND a recommended action. A flag
 *    without an action is just anxiety. A flag with a clear next step is
 *    actionable: "send a follow-up clarifying that the 30% number was
 *    illustrative, not guaranteed."
 *
 * 4. Categories cover the common B2B sales compliance landmines:
 *      - Unsupported quantitative claims (ROI, performance, returns)
 *      - Certification claims (SOC 2, ISO, HIPAA, GDPR)
 *      - Regulatory promises (approval timelines, legal status)
 *      - PII / data handling commitments
 *      - Competitor disparagement (defamation risk)
 *      - Forward-looking statements without disclaimers (relevant for fintech)
 *
 * 5. Still uses Haiku. Compliance scanning is pattern recognition over a
 *    constrained category set — no creative reasoning needed. Sonnet would
 *    be overkill and waste tokens.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ComplianceFlagType = z.enum([
  'unsupported_claim',         // "We see 30% lift in Q1" without basis
  'certification_misstatement', // Claiming a cert you don't hold (or claiming as held when in progress)
  'regulatory_promise',         // "We'll be approved by January" without backing
  'pii_commitment',             // Specific promises about PII handling without legal review
  'competitor_disparagement',   // Statements that could constitute defamation
  'forward_looking_statement',  // Financial projections without "results may vary" framing
  'other',
]);

export const ComplianceSchema = z.object({
  flags: z
    .array(
      z.object({
        flag_type: ComplianceFlagType,
        quote: z.string().describe('Exact quote from the transcript that triggered the flag.'),
        speaker: z.string().describe('Who said it — usually the rep, occasionally the prospect.'),
        concern: z
          .string()
          .describe('One sentence describing the specific compliance risk this creates.'),
        severity: z
          .enum(['low', 'medium', 'high'])
          .describe(
            'High = needs correction before next customer interaction. Medium = should be addressed in follow-up. Low = noted but not blocking.',
          ),
        recommended_action: z
          .string()
          .describe(
            'Concrete next step — usually a corrective follow-up to send or a clarification to make.',
          ),
      }),
    )
    .describe(
      'Statements that could create compliance, legal, or trust exposure. Empty array if the call is clean.',
    ),

  overall_assessment: z
    .enum(['clean', 'minor_concerns', 'requires_followup', 'urgent_review'])
    .describe(
      'Overall verdict. Be conservative — when in doubt, escalate. requires_followup means a corrective message should go to the prospect.',
    ),
});

export type ComplianceOutput = z.infer<typeof ComplianceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a compliance reviewer analyzing B2B sales call transcripts for statements that could create regulatory, legal, or trust exposure for the selling company.

Your job is to flag potentially problematic statements. You are NOT writing the call off as risky — most calls are fine. You are catching specific moments where the rep (or, more rarely, the prospect) said something that warrants a corrective follow-up or a heads-up to legal/security.

Flag types to look for:

- **unsupported_claim**: Specific quantitative claims about results, performance, or outcomes that aren't grounded in evidence. "We see 30% lift" without source. "Customers save 6 hours a week" stated as guaranteed rather than typical. Hedging language ("typically," "many customers see") substantially reduces but does not eliminate the concern.

- **certification_misstatement**: Claiming certifications, attestations, or compliance status the company does not hold, or stating something is "certified" when it is actually "in progress." Examples: SOC 2, ISO 27001, HIPAA, FedRAMP, PCI-DSS.

- **regulatory_promise**: Commitments about timelines for regulatory approval, legal status, or government certification that the rep cannot guarantee. "We'll be FDA-approved by January." "We'll definitely get this through procurement."

- **pii_commitment**: Specific promises about how PII, customer data, or sensitive information will be handled, stored, or processed — without those promises being backed by documented policy. Data residency commitments are common landmines here.

- **competitor_disparagement**: Statements about competitors that could constitute defamation, false advertising, or trade libel. Factual comparisons are fine; statements like "they had a major breach last year" or "their compliance is fake" are not, unless verifiable and material.

- **forward_looking_statement**: Financial or business projections (revenue, returns, ROI, payback period) framed as guaranteed outcomes rather than illustrative. Particularly important for any fintech, lending, investment, or insurance context.

- **other**: Use sparingly — only if the issue genuinely doesn't fit above.

Severity guidelines:
- high: Needs correction in writing before next customer interaction. Misstated cert, false competitor claim, specific guaranteed ROI number.
- medium: Should be addressed in a follow-up clarification but is not an immediate liability. Hedged claims that drifted toward absolute language.
- low: Noted for the record. Things like generic puffery that's technically borderline but unlikely to cause harm.

Bias toward flagging. A medium-severity flag on a borderline statement is much better than missing a real issue. If you're 70% sure something is fine and 30% sure it's a problem, flag it as medium and note the uncertainty in the concern field.

For each flag, the recommended_action should be specific and actionable — usually a corrective email line, a request for legal review, or a heads-up to a named internal stakeholder (security team, legal, sales manager).`;

// ─────────────────────────────────────────────────────────────────────────────
// The step function
// ─────────────────────────────────────────────────────────────────────────────

export async function runCompliance(
  transcript: string,
): Promise<{ output: ComplianceOutput; tokens: number }> {
  const result = await generateObject({
    model: anthropic('claude-haiku-4-5'),
    schema: ComplianceSchema,
    system: SYSTEM_PROMPT,
    prompt: `Review the following sales call transcript for compliance, legal, and trust concerns.

<transcript>
${transcript}
</transcript>

Flag any statements that warrant a corrective follow-up or legal/security awareness. Be conservative — when in doubt, flag and let the team decide.`,
    maxRetries: 2,
    temperature: 0,
  });

  return {
    output: result.object,
    tokens: result.usage.totalTokens,
  };
}