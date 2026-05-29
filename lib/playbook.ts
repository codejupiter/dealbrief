/**
 * lib/playbook.ts
 *
 * Hardcoded library of objection-response patterns for the cross-reference step.
 *
 * In a production system, this would be a vector database the sales team writes to
 * as new objections come in. For v1, hardcoding is the right call — it makes the
 * pipeline self-contained, debuggable, and demoable without any infra.
 *
 * Each play has:
 *   - id: stable identifier
 *   - category: matches the ObjectionCategory enum from classify.ts
 *   - pattern: the kind of objection this play addresses, in natural language
 *              (this is what we embed and compare against)
 *   - suggested_response: a battle-tested counter-argument
 *   - escalate_to: optional — if this objection usually needs senior involvement
 *
 * The README's "what I'd build next" section flags replacing this with a real
 * vector store that the team can write to.
 */

import type { ObjectionCategory } from './steps/classify';

export interface Play {
  id: string;
  category: z.infer<typeof ObjectionCategory>;
  pattern: string;
  suggested_response: string;
  escalate_to?: 'sales_manager' | 'solutions_engineer' | 'finance' | 'security' | 'cmo';
}

// Note: I'm importing the type but not actually using Zod here — keeping the
// import to make the relationship explicit. In practice you'd use the type alias.
import type { z } from 'zod';

export const PLAYBOOK: Play[] = [
  // ──────────────── PRICE ────────────────
  {
    id: 'price-budget-constraint',
    category: 'price',
    pattern: 'The annual contract is over our budget or significantly higher than what we currently spend on similar tools.',
    suggested_response:
      'Reframe from sticker price to total cost of ownership. Quantify the displacement of existing tools they will stop paying for, plus the labor hours saved. Offer a phased rollout with a smaller initial commitment to spread budget impact across fiscal periods.',
    escalate_to: 'finance',
  },
  {
    id: 'price-procurement-blocker',
    category: 'price',
    pattern: 'The buyer wants to proceed but finance or procurement is the blocker on signing.',
    suggested_response:
      'Provide a finance-ready one-pager with the business case, ROI math, and risk-adjusted forecast. Offer to join a call with the finance stakeholder directly. Position the deal terms as flexible (pilot, ramp pricing, quarterly billing) to give finance levers to pull.',
    escalate_to: 'finance',
  },
  {
    id: 'price-roi-skepticism',
    category: 'price',
    pattern: 'The buyer is skeptical that the stated ROI will materialize, often due to past disappointments with similar tools.',
    suggested_response:
      'Avoid claiming guaranteed ROI numbers — that creates compliance risk and erodes trust. Instead, offer a structured pilot with measurable baseline metrics and a clear evaluation rubric agreed up front. Provide case studies from similar-sized customers in their industry.',
  },

  // ──────────────── TIMING ────────────────
  {
    id: 'timing-existing-contract',
    category: 'timing',
    pattern: 'The buyer recently renewed a contract with an incumbent tool, creating overlap and budget pressure.',
    suggested_response:
      'Map the value overlap precisely. If your product replaces a portion of the incumbent (not all of it), quantify the downgrade savings on the incumbent side. Time the contract start to align with the incumbent\'s next renewal cycle to eliminate overlap.',
  },
  {
    id: 'timing-fiscal-cycle',
    category: 'timing',
    pattern: 'The buyer wants to align the purchase with their fiscal year, budget refresh, or planning cycle.',
    suggested_response:
      'Confirm the exact decision date and budget refresh timeline. Offer to sign a non-binding letter of intent now to lock pricing, with the formal contract dated to align with the new fiscal period. This gives them certainty without budget commitment.',
  },

  // ──────────────── TECHNICAL ────────────────
  {
    id: 'technical-integration-gap',
    category: 'technical',
    pattern: 'The buyer is concerned about whether the product integrates cleanly with their existing stack.',
    suggested_response:
      'Get specific about which integrations matter. Confirm support for their critical systems. If an integration is missing, scope the lift honestly — promised integrations that slip post-sale destroy trust. Offer to bring a solutions engineer to the next call for a deeper technical review.',
    escalate_to: 'solutions_engineer',
  },
  {
    id: 'technical-data-residency',
    category: 'technical',
    pattern: 'The buyer requires data to be stored or processed in a specific geographic region for regulatory reasons.',
    suggested_response:
      'Confirm whether you currently support the required residency. If yes, send the architecture documentation. If no, do not promise a timeline you cannot commit to. Loop in security to assess feasibility and provide an honest delivery estimate.',
    escalate_to: 'security',
  },

  // ──────────────── POLITICAL ────────────────
  {
    id: 'political-missing-decision-maker',
    category: 'political',
    pattern: 'A senior stakeholder who needs to approve the deal has not been engaged in the sales process.',
    suggested_response:
      'Do not bypass the champion. Ask the champion what the missing stakeholder cares about, then build a tailored briefing document for that stakeholder. Offer to join a meeting the champion runs internally rather than pushing for a direct call too early.',
  },
  {
    id: 'political-internal-resistance',
    category: 'political',
    pattern: 'A named internal stakeholder is expected to resist the purchase based on their role or past behavior.',
    suggested_response:
      'Identify the resister\'s top concern (usually cost, risk, or change management). Equip the champion with a one-pager addressing that specific concern. If possible, route around the resister by aligning with a more senior decision-maker who can override.',
    escalate_to: 'sales_manager',
  },

  // ──────────────── COMPETITOR ────────────────
  {
    id: 'competitor-incumbent-comparison',
    category: 'competitor',
    pattern: 'The buyer is comparing your product against an incumbent solution they already use.',
    suggested_response:
      'Acknowledge the incumbent\'s strengths honestly — buyers see through hatchet jobs. Focus the comparison on the specific capabilities the incumbent lacks that map to the buyer\'s stated pain points. Avoid feature-by-feature spreadsheets; lead with outcomes.',
  },

  // ──────────────── TRUST ────────────────
  {
    id: 'trust-prior-bad-experience',
    category: 'trust',
    pattern: 'The buyer has been burned by previous vendors that overpromised and underdelivered.',
    suggested_response:
      'Lead with constraints, not claims. Offer a structured pilot with predefined success criteria, a written exit clause, and quarterly business reviews. Provide references the buyer can contact directly without going through your team.',
  },
  {
    id: 'trust-security-compliance',
    category: 'trust',
    pattern: 'The buyer requires specific security certifications (SOC 2, ISO 27001) or compliance attestations.',
    suggested_response:
      'Confirm certification status truthfully. If certified, send the report under NDA. If certification is in progress, share the timeline and the auditor name. Never claim certifications you do not hold — this is a compliance liability and a deal-killer when discovered.',
    escalate_to: 'security',
  },
];