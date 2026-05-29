# dealbrief — Spec

**One-line:** Paste a messy sales call transcript, get a structured deal brief with objections classified, compliance flags raised, and recommended next steps — built as a visible multi-step LLM pipeline so you can watch the agent think.

**Status:** Spec v1 — pre-build.
**Target:** Live demo at `dealbrief.zoriahcocio.com` within 2 weeks.
**Author:** Zoriah Cocio (codejupiter)

---

## Why this exists

Sales reps end calls with a wall of notes nobody re-reads. Sales ops wants structured data — objections, next steps, risk flags. Compliance wants to know if anyone said anything regulated. Today this is done by hand, badly, or not at all.

A single LLM call could attempt this in one shot, but the output would be a black box: hard to trust, hard to debug, hard to evaluate. A multi-step pipeline makes the work *legible* — you can see what was extracted, how it was classified, why a flag was raised, and which playbook response was matched. That's the difference between a demo and a tool a team would actually adopt.

This project is a portfolio piece, but the architecture is real. The pipeline pattern here is how production AI features should be built when correctness and trust matter more than latency.

---

## User flow

1. User lands on the page. Sees a textarea with sample transcripts they can load with one click (no need to bring their own data).
2. User clicks "Generate Brief."
3. The pipeline runs visibly — each step is a card that lights up, streams its output, and completes. Total runtime: 15–30 seconds.
4. Final structured brief appears in the right pane: deal summary, objections, risk flags, recommended next actions, suggested follow-up message.
5. User can copy the brief, download as markdown, or run another transcript.

No login. No save. No database. The demo *is* the product.

---

## The pipeline

Five steps, each one a visible card in the UI. Each step is a tool call the orchestrator invokes in sequence (or in parallel where possible). All intermediate results stream to the client.

### Step 1 — Extract
Pull structured entities from the raw transcript: people (with roles if stated), company names, dollar amounts, dates, products mentioned, decision criteria stated, timeline signals.

**Output shape:** JSON with `people[]`, `companies[]`, `amounts[]`, `dates[]`, `products[]`, `criteria[]`, `timeline_signals[]`.

### Step 2 — Classify objections
Read the transcript and categorize any objections raised. Categories: `price`, `timing`, `technical`, `political` (internal stakeholder issues), `competitor`, `trust`, `other`.

**Output shape:** Array of `{category, quote, severity: 'low'|'medium'|'high', confidence: 0–1}`.

### Step 3 — Cross-reference playbook
Match each objection against a small hardcoded library of playbook responses. Library lives in `/lib/playbook.ts` — 10 entries to start, each with `{objection_pattern, suggested_response, escalate_to?}`.

**Output shape:** Array of `{objection_id, matched_play, suggested_response, confidence}`.

### Step 4 — Compliance scan
Flag anything in the transcript that sounds regulated: financial advice given without disclaimers, claims about returns, promises about regulatory approval, mentions of insider info, GDPR/PII handling concerns. Conservative — false positives are better than misses here.

**Output shape:** Array of `{flag_type, quote, severity, recommended_action}`. Empty array if clean.

### Step 5 — Synthesize brief
Take the outputs of steps 1–4 and generate the final structured brief:
- Deal summary (2–3 sentences)
- Stage assessment (early/middle/late, with reasoning)
- Top 3 objections + recommended responses
- Risk flags (compliance + buying signal warnings)
- Recommended next actions (3 concrete items)
- Draft follow-up message to send to the prospect

**Output shape:** Structured markdown rendered in the right pane.

---

## What makes this not a chatbot wrapper

Three things distinguish this from "ChatGPT but with a system prompt":

1. **Visible orchestration.** Users see each step run independently, not a single black-box completion. This is the agentic claim made concrete.
2. **Step-level observability.** Each card shows token count, latency, and the LLM's self-reported confidence. This is the "production-minded" claim made concrete.
3. **Replayable pipeline.** If step 3 returns garbage, the user (or developer) can re-run just step 3 against the cached output of step 2. No re-running the whole pipeline. This is the "thought about scale" claim made concrete.

---

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **LLM:** Anthropic Claude via the Vercel AI SDK (`@ai-sdk/anthropic`)
- **Model:** `claude-sonnet-4-5` for synthesis steps, `claude-haiku-4-5` for extraction/classification (cost/latency optimization, and it shows you're thinking about that)
- **Streaming:** Vercel AI SDK's `streamText` + custom data streaming for intermediate step outputs
- **State:** React state + URL params for shareable runs
- **Deploy:** Vercel
- **Domain:** `dealbrief.zoriahcocio.com`

No database. No auth. No backend server beyond Next.js API routes.

---

## File structure

```
dealbrief/
├── app/
│   ├── page.tsx                  # Main UI
│   ├── api/
│   │   └── pipeline/
│   │       └── route.ts          # Orchestrator endpoint, streams results
│   └── layout.tsx
├── lib/
│   ├── steps/
│   │   ├── extract.ts            # Step 1
│   │   ├── classify.ts           # Step 2
│   │   ├── crossref.ts           # Step 3
│   │   ├── compliance.ts         # Step 4
│   │   └── synthesize.ts         # Step 5
│   ├── playbook.ts               # Hardcoded objection-response library
│   ├── samples.ts                # Pre-loaded sample transcripts
│   ├── schemas.ts                # Zod schemas for each step's I/O
│   └── orchestrator.ts           # The pipeline runner
├── components/
│   ├── PipelineCard.tsx          # The streaming step card
│   ├── BriefOutput.tsx           # The final rendered brief
│   ├── TranscriptInput.tsx       # Input pane with sample loader
│   └── ObservabilityPanel.tsx    # Token counts, latency, confidence
├── README.md
└── SPEC.md                       # This doc
```

---

## UI layout

```
┌─────────────────────────────────────────────────────────────────┐
│  dealbrief                                          [GitHub] [?] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ TRANSCRIPT           │  │ PIPELINE                          │ │
│  │                      │  │                                   │ │
│  │ [Load sample ▾]      │  │ ① Extract        ✓  120ms  340t  │ │
│  │                      │  │ ② Classify       ✓  280ms  520t  │ │
│  │ ┌──────────────────┐ │  │ ③ Cross-ref     ⟳  running...   │ │
│  │ │                  │ │  │ ④ Compliance    ◯  queued        │ │
│  │ │  raw transcript  │ │  │ ⑤ Synthesize    ◯  queued        │ │
│  │ │                  │ │  │                                   │ │
│  │ └──────────────────┘ │  ├──────────────────────────────────┤ │
│  │                      │  │ BRIEF                             │ │
│  │ [Generate Brief]     │  │                                   │ │
│  │                      │  │  (streams in as final step runs) │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Three-pane layout: input on the left, pipeline progress + final brief stacked on the right. Each pipeline card is clickable — opens an expanded view showing that step's full input, output, and token usage.

---

## Sample transcripts (write these first)

Five samples covering the interesting cases. Each ~300–600 words of realistic dialogue.

1. **Easy close** — prospect is sold, just needs procurement timeline. Clean, no objections. Tests that the pipeline doesn't hallucinate problems.
2. **Price objection, medium severity** — prospect likes the product, hates the price. Standard playbook response should match.
3. **Political deal** — multiple stakeholders, one champion, one skeptic, CFO not yet involved. Tests the "stage assessment" logic.
4. **Compliance landmine** — rep says something like "we can guarantee 30% returns" or "we're SOC2 certified" (when they're not yet). Tests the compliance scanner.
5. **Ambiguous / messy** — prospect gives mixed signals, rep doesn't ask good questions. Tests how the system handles low-signal input without making things up.

Write these by hand, not with an LLM. They need to feel real, and hand-written ones will. Spending an hour on these pays off in every demo.

---

## What ships in v1

- [ ] Five-step pipeline running end-to-end on Anthropic Claude
- [ ] Streaming UI with per-step cards (running, complete, error states)
- [ ] Five hand-written sample transcripts loadable with one click
- [ ] Final brief rendered as markdown with copy-to-clipboard
- [ ] Observability panel showing tokens + latency per step
- [ ] Deployed to `dealbrief.zoriahcocio.com`
- [ ] README with embedded Loom (30–60 seconds), architecture diagram, and "what I'd build next"

## What does NOT ship in v1 (cut these ruthlessly)

- Auth, login, accounts
- Database, persistence beyond localStorage
- "Bring your own API key" — use a server-side key with strict rate limits
- Multi-tenancy, sharing, collab features
- Real-time collaboration on the brief
- Custom playbook editing (hardcoded library is fine for the demo)
- File upload (paste-only is fine)
- CRM integrations (would be the obvious v2 pitch in the README)

---

## "What I'd build next" — for the README

This section signals senior thinking. Sketch now, write properly when shipping.

- **Eval harness.** Right now confidence scores are LLM self-reports. Real production would need ground-truth-labeled transcripts and per-step accuracy metrics.
- **Playbook learning.** The hardcoded library should be replaced with a vector store the team can write to as new objections come in. Cross-ref step becomes RAG.
- **CRM write-back.** The brief should write structured fields back to Salesforce/HubSpot, not just render markdown.
- **Per-step model routing.** Cost/latency optimization: extraction can run on Haiku, synthesis needs Sonnet. Already partially done in v1, but should be configurable.
- **Streaming intermediate corrections.** If step 4 finds a compliance issue, step 5's synthesis should be aware of it as it streams, not after step 4 completes.

---

## Risks & honest caveats

- **The playbook is hardcoded.** This is the weakest part architecturally. Mitigation: call it out explicitly in the README as a deliberate v1 cut.
- **No eval data means "confidence" is theater.** Mitigation: make the LLM's self-reported confidence visible but don't oversell it. The README's "what I'd build next" should lead with eval harness.
- **B2B sales is not a domain I have deep ops experience in.** The samples need to feel real. Mitigation: read a few real sales call transcripts on the internet first (Gong has public examples), don't ship samples that read like a junior PM imagining sales.

- **Cross-reference scores are lower than ideal.** Cosine similarity scores fell because objection summaries (specific) and playbook patterns (general) live at different abstraction levels. Production fix is an LLM re-ranker over top-N candidates — flagged in v2 work.

---

## Done = shippable

Definition of done for the sprint:
1. A hiring manager who's never seen the project can land on the URL, click "Load sample → Easy close" → "Generate Brief," and watch the pipeline run end-to-end in under 30 seconds without any errors.
2. The README's Loom video makes them understand the architecture in 60 seconds without needing to read code.
3. Every cover letter you send after this can link to `dealbrief.zoriahcocio.com` as the agentic AI proof point.

That's the bar. Hit it and stop.
