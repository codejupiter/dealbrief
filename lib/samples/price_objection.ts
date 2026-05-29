/**
 * Sample transcript: Price objection, medium severity
 *
 * Scenario: Mid-funnel discovery + demo follow-up call.
 * Prospect: Marketing Ops Director at a 200-person B2B SaaS company.
 * Rep: AE selling a marketing analytics platform.
 *
 * Why this exercises the pipeline:
 * - Clear price objection (Step 2 should catch it, classify as 'price', severity 'medium')
 * - Champion is bought in, but flagged "need to convince finance" (Step 2 also catches political)
 * - Real timeline signal ("end of Q1") for Step 1 to extract
 * - Rep makes one borderline claim about ROI that compliance scan should flag (Step 4)
 * - No clean playbook match for the "we already have a tool" objection (Step 3 should
 *   show low confidence, which is the honest right answer)
 */

export const sample_price_objection = {
  id: 'price-medium',
  label: 'Price objection (medium)',
  description: 'Champion is sold, finance is the blocker. Some compliance friction.',
  transcript: `
[Call recording — 24 minutes — June 2 between Sarah Chen (Marketing Ops Director, Brightline)
and Marcus Webb (Account Executive, Pulse Analytics)]

MARCUS: Hey Sarah, thanks for jumping back on. Last time we walked through the dashboard
piece — I wanted to use this call to dig into the attribution side and then talk through
next steps. Sound good?

SARAH: Yeah, that works. I've had a chance to play with the demo account you set up.
Honestly the attribution model is — it's better than what we have in HubSpot right now.
The multi-touch view especially. My team would actually use that.

MARCUS: That's great to hear. What's resonating most with the team?

SARAH: The fact that it pulls in our paid social spend automatically. Right now we're
exporting CSVs from three different platforms and reconciling them in a spreadsheet.
That alone would save us probably six hours a week.

MARCUS: Right, that's pretty consistent with what we hear. Customers in your size range
typically see twenty to thirty percent lift in marketing efficiency in the first quarter
just from cleaner attribution data. So you're definitely going to see ROI fast.

SARAH: I mean — that's the pitch, but I'd want to see how that actually plays out for us
specifically. We've been burned by tools that promise lift and don't deliver.

MARCUS: Totally fair. Which is why we offer the 90-day check-in where we benchmark against
your pre-implementation numbers. If we're not seeing measurable improvement, we have a
serious conversation.

SARAH: Okay. So — I want to be straight with you. I'm sold on the product. My team is sold.
The blocker is going to be Jennifer in finance. The number you sent over — forty-eight
thousand a year — is more than double what we're currently spending on our analytics
stack. And we just renewed HubSpot in March, so we're already locked into that contract.

MARCUS: Yeah, the HubSpot overlap is something we hear a lot. The way we usually think
about it is, we're not replacing HubSpot's CRM — we're replacing the attribution and
reporting layer specifically. Most customers end up downgrading their HubSpot Marketing
Hub tier after switching to us, which usually offsets eight to twelve thousand of our cost.

SARAH: Right, but Jennifer is going to look at the line item and see a new forty-eight
thousand dollar expense. She doesn't care that we might save somewhere else nine months
from now.

MARCUS: What if we structured it differently? We could do a six-month pilot at fifty
percent off the annual rate. Twelve thousand for six months instead of twenty-four. That
gives you a real number to show ROI on before the full commitment.

SARAH: That's more interesting. But I'd need to bring that to Jennifer and probably to
David — our CMO. He hasn't been on any of these calls but he's going to want to weigh in
before we sign anything.

MARCUS: Would it help if I put together a one-pager for David? Something he can review
in five minutes that covers the business case, the pilot structure, and the success metrics?

SARAH: Yeah, that would actually help a lot. The other thing is — Jennifer is going to ask
about SOC 2. Are you guys certified?

MARCUS: We are SOC 2 Type II. I can have our security team send over the report under NDA.

SARAH: Okay. Good. What about data residency? We have some EU customer data we'd be sending
through your system.

MARCUS: We're GDPR compliant, and we have an EU data residency option. That's a separate
add-on but it's not crazy expensive.

SARAH: Okay. I think the path forward is — you send me the one-pager for David and the SOC 2
docs, I'll set up a call with David and Jennifer for next week, and then we go from there.
I'd like to have a decision by end of Q1 because our budget refresh happens in April and I
want this in the plan.

MARCUS: Perfect. I'll get that over to you by tomorrow morning. End of Q1 is — that's about
four weeks out, right? That works on our side. We can have you fully onboarded by the start
of Q2.

SARAH: Okay. Thanks Marcus.

MARCUS: Thanks Sarah. Talk soon.

[End of call]
`.trim(),
};
