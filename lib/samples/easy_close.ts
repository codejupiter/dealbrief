/**
 * lib/samples/easy_close.ts
 *
 * Sample: Easy close — prospect is sold, just needs procurement timing.
 * No real objections.
 *
 * Why this exists: Tests that the pipeline doesn't fabricate objections or
 * compliance issues when the call is clean. A pipeline that always finds
 * five "concerns" in every call is overcalibrated and useless.
 */

export const sample_easy_close = {
    id: 'easy-close',
    label: 'Easy close',
    description: 'Prospect is sold. Just needs procurement timing.',
    transcript: `
  [Call recording — 14 minutes — June 4 between Diego Martinez (VP Engineering, Northbeam Logistics)
  and Priya Shah (Account Executive, Compass Observability)]
  
  PRIYA: Hey Diego, thanks for getting back on. Last call you mentioned you'd
  walked through the dashboard with your platform team. Where did you land?
  
  DIEGO: Yeah, so I talked to my SRE lead, Kenji, and we both think this is the
  right call. The distributed tracing alone is going to save us a ton of time on
  incident response. Our current setup with Datadog and the in-house dashboards
  just doesn't give us the cross-service correlation we need.
  
  PRIYA: That's great to hear. Was there anything Kenji flagged as a concern?
  
  DIEGO: Honestly, no. He spent about two hours in the demo environment and his
  only comment was "why are we still talking about this." We're ready to move.
  
  PRIYA: Awesome. So on next steps — we have the proposal for ninety-six thousand
  a year for the team-tier plan, which covers your fifteen services and twenty
  engineers. Does that match what you had in mind?
  
  DIEGO: Yeah, that's what we expected. The procurement piece is the only thing
  slowing us down on our side. Our CFO requires a thirty-day vendor review for
  any new SaaS contract over fifty thousand. We've already started that process,
  so we're looking at signing around the second week of July.
  
  PRIYA: Got it. Is there anything I can do to support the procurement review?
  Sometimes vendors get hit with questionnaires.
  
  DIEGO: Yeah, you'll get our security questionnaire. It's pretty standard, but
  includes SOC 2 documentation, our DPA, and a sub-processor list. If you can
  have those ready by next Monday, that keeps us on track for the July signing.
  
  PRIYA: We can definitely have those over to you by Monday. I'll send them to
  your IT security inbox unless you'd prefer somewhere else.
  
  DIEGO: Security inbox is fine. CC me so I can track it.
  
  PRIYA: Done. And on commercials — we typically do annual contracts with quarterly
  billing options. Any preference?
  
  DIEGO: Quarterly billing works better for our finance team. Spreads the cash
  out a bit.
  
  PRIYA: Quarterly it is. I'll get a redlined contract over to you alongside the
  security docs on Monday. That way procurement has everything they need in one
  package.
  
  DIEGO: Perfect. One thing though — once we sign, can you set up onboarding for
  the second week of July? I want Kenji and the platform team in your training
  the first day we have access.
  
  PRIYA: Absolutely. I'll loop in our customer success lead, Rae Hopkins, to
  schedule the onboarding kickoff for the week of July 14th, contingent on
  signing the week before. That sound right?
  
  DIEGO: Sounds right. Thanks Priya.
  
  PRIYA: Thanks Diego. Have a good one.
  
  [End of call]
  `.trim(),
  };
  