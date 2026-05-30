/**
 * lib/samples/compliance_landmine.ts
 *
 * Sample: Compliance landmine — rep makes multiple statements that should
 * trigger high-severity compliance flags.
 *
 * Why this exists: Most sales calls are clean. But the compliance scanner
 * earns its place in the pipeline by catching the calls that aren't. This
 * sample stress-tests that detection.
 *
 * Landmines planted (the compliance step should catch these):
 * - "We guarantee 30% returns" — forward_looking_statement + unsupported_claim
 * - "We're FDA-approved" when only in submission — certification_misstatement
 * - "Competitor X had a major breach last year" — competitor_disparagement
 *   without verification
 * - Specific PII handling promises without policy backing
 */

export const sample_compliance_landmine = {
    id: 'compliance-landmine',
    label: 'Compliance landmine',
    description: 'Rep oversteps on guarantees, certifications, and competitor claims.',
    transcript: `
  [Call recording — 19 minutes — May 28 between Avery Tanaka (Director of Risk,
  Pinegrove Capital) and Jordan Webb (Senior Account Executive, Quantis Health)]
  
  AVERY: Hey Jordan, thanks for the time. I have your deck up. Walk me through
  how Quantis differs from what we're using today.
  
  JORDAN: Sure. So as you know, we're in the AI-powered claims optimization space.
  The pitch is simple: every dollar you put through our system, we guarantee a
  thirty percent reduction in claims processing cost in the first year. That's
  not a typical-customer-results-may-vary number. That's a guarantee.
  
  AVERY: That's a strong claim. Is that documented somewhere?
  
  JORDAN: It's in our standard MSA. We're so confident in the platform that we
  back it contractually. You'll see it when we get to paper.
  
  AVERY: Interesting. What about regulatory? We're dealing with PHI, so we need
  HIPAA at minimum, and our compliance team is pushing for SOC 2 Type II as well.
  
  JORDAN: Yeah, we're HIPAA-compliant, SOC 2 Type II certified, and we're FDA-
  approved for clinical decision support workflows. So you're covered on all three
  fronts.
  
  AVERY: FDA-approved? I thought Quantis was still in the FDA submission process
  for the clinical decision support side. The TechCrunch piece from February
  mentioned a 510(k) filing.
  
  JORDAN: Right, so technically the submission is in flight, but we're operating
  under enforcement discretion, so functionally it's the same thing. The 510(k)
  should clear by end of Q3, and we're already operating with several large
  health systems under that framework.
  
  AVERY: Okay. What about competitors? We've been evaluating MedFlow Analytics
  as an alternative.
  
  JORDAN: Yeah, MedFlow. Honest answer — they had a major data breach last year
  that exposed customer claims data, and they've been trying to quiet it down.
  I wouldn't go near them with PHI. Their security posture is, frankly, fake. We
  hear from their customers all the time who are trying to get out.
  
  AVERY: I hadn't heard about a breach. Do you have a source?
  
  JORDAN: It was in the security trade press. I can dig up the link and send it
  over. The main thing is, we're a much more mature platform on that dimension.
  
  AVERY: Okay. Last thing on my list — data handling. We need to know that any
  PHI sent through your system stays within the US, doesn't get used for model
  training, and gets purged within ninety days of contract termination.
  
  JORDAN: All three of those — yes, yes, and yes. We absolutely keep PHI US-only,
  we never train on customer data, and we'll purge within ninety days. I can put
  that in writing as part of the contract.
  
  AVERY: We'd need our security team to review the technical details on the
  training piece specifically. There's a difference between "we don't train on
  PHI" and "we don't process PHI through any third-party models that might train
  on it."
  
  JORDAN: Totally fair. We don't do either. We have our own in-house models and
  nothing leaves your tenant. I can have our CISO confirm in writing.
  
  AVERY: That would be helpful. Let me take this back to my compliance team and
  the CIO. What's your timeline for closing this quarter?
  
  JORDAN: We'd love to have a signed contract by end of June so we can start
  implementation in July. I'll send over our standard MSA along with the
  compliance documentation today. You should have everything by EOD.
  
  AVERY: Sounds good. Thanks Jordan.
  
  JORDAN: Thanks Avery. Talk soon.
  
  [End of call]
  `.trim(),
  };
  