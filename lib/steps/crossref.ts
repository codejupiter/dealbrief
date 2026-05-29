/**
 * lib/steps/crossref.ts
 *
 * Step 3 of the pipeline. Matches classified objections against the
 * hardcoded playbook using semantic similarity (Voyage embeddings + cosine).
 *
 * Design decisions:
 *
 * 1. This step is INTENTIONALLY NOT an LLM call. Real production pipelines
 *    mix LLM and deterministic steps. For "find the best playbook match,"
 *    cosine similarity over embeddings is the right tool — faster, cheaper,
 *    and more deterministic than an LLM call.
 *
 * 2. We embed BOTH the objection summary and the play's full text (pattern +
 *    suggested_response), then take cosine similarity. The pattern alone is
 *    too abstract to match well against specific objection summaries; including
 *    the response language pulls in the concrete vocabulary deal teams use
 *    (e.g. "upfront cost," "ROI math") which lifts cosine scores meaningfully.
 *
 * 3. We filter by category first to narrow the search space. A price objection
 *    should never pseudo-match a trust play, even if their embeddings overlap.
 *
 * 4. The playbook is embedded ONCE at module load (memoized). In a real system,
 *    these embeddings would live in a vector DB.
 *
 * 5. Confidence thresholds are tuned empirically against the sample transcripts.
 *    Textbook thresholds (0.75+ for strong) don't apply when query and corpus
 *    are at different abstraction levels — 0.65+ is a strong match here.
 *
 * 6. Low scores (< 0.45) surface as "none" — "no strong match" is more honest
 *    than "here's a weak match presented confidently."
 *
 * 7. We call the Voyage REST API directly with fetch rather than using the
 *    voyageai npm SDK. The SDK has a bundling bug with Turbopack. Calling the
 *    REST API directly is simpler, has fewer dependencies, and avoids the issue.
 */

import { PLAYBOOK, type Play } from '@/lib/playbook';
import type { ClassifyOutput } from './classify';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchedObjection {
  objection_summary: string;
  objection_category: string;
  matched_play_id: string | null;
  matched_play_pattern: string | null;
  suggested_response: string | null;
  escalate_to: Play['escalate_to'] | null;
  confidence: number; // 0–1 cosine similarity
  match_quality: 'strong' | 'moderate' | 'weak' | 'none';
}

export interface CrossrefOutput {
  matches: MatchedObjection[];
}

interface VoyageEmbedResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct fetch to Voyage API
// ─────────────────────────────────────────────────────────────────────────────

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const EMBED_MODEL = 'voyage-3-lite';

async function embed(
  texts: string[],
  inputType: 'query' | 'document',
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not set in environment.');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: EMBED_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voyage API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as VoyageEmbedResponse;
  return data.data.map((item) => item.embedding);
}

// ─────────────────────────────────────────────────────────────────────────────
// Playbook embedding cache
// ─────────────────────────────────────────────────────────────────────────────

let playbookEmbeddings: number[][] | null = null;

async function embedPlaybookOnce(): Promise<number[][]> {
  if (playbookEmbeddings) return playbookEmbeddings;
  // Embed pattern + suggested_response together. The pattern alone is too
  // abstract to match well against specific objection summaries; including
  // the response language pulls in the concrete vocabulary deal teams use
  // (e.g. "upfront cost," "ROI math") which lifts cosine scores meaningfully.
  const fullTexts = PLAYBOOK.map(
    (play) => `${play.pattern}\n\n${play.suggested_response}`,
  );
  playbookEmbeddings = await embed(fullTexts, 'document');
  return playbookEmbeddings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Math
// ─────────────────────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function qualityFromConfidence(score: number): MatchedObjection['match_quality'] {
  // Tuned empirically against sample transcripts. Lower than textbook
  // thresholds because objection summaries (specific) and playbook patterns
  // (general) live at different abstraction levels; cosine scores will
  // naturally come in lower than a same-corpus retrieval task.
  if (score >= 0.65) return 'strong';
  if (score >= 0.55) return 'moderate';
  if (score >= 0.45) return 'weak';
  return 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// The step function
// ─────────────────────────────────────────────────────────────────────────────

export async function runCrossref(
  classified: ClassifyOutput,
): Promise<{ output: CrossrefOutput; tokens: number }> {
  const playEmbeddings = await embedPlaybookOnce();

  if (classified.objections.length === 0) {
    return { output: { matches: [] }, tokens: 0 };
  }

  // Embed all objection summaries in one batch call.
  const objectionTexts = classified.objections.map((obj) => obj.summary);
  const objectionEmbeddings = await embed(objectionTexts, 'query');

  const matches: MatchedObjection[] = classified.objections.map((obj, i) => {
    const objEmbedding = objectionEmbeddings[i];

    // Filter candidates to same category. Without this, a "price" objection
    // might pseudo-match a "trust" play just because they share generic
    // deal language.
    const candidates = PLAYBOOK.map((play, idx) => ({ play, embedding: playEmbeddings[idx] }))
      .filter(({ play }) => play.category === obj.category);

    if (candidates.length === 0) {
      return {
        objection_summary: obj.summary,
        objection_category: obj.category,
        matched_play_id: null,
        matched_play_pattern: null,
        suggested_response: null,
        escalate_to: null,
        confidence: 0,
        match_quality: 'none',
      };
    }

    const scored = candidates.map(({ play, embedding }) => ({
      play,
      score: cosineSimilarity(objEmbedding, embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    return {
      objection_summary: obj.summary,
      objection_category: obj.category,
      matched_play_id: best.play.id,
      matched_play_pattern: best.play.pattern,
      suggested_response: best.play.suggested_response,
      escalate_to: best.play.escalate_to ?? null,
      confidence: best.score,
      match_quality: qualityFromConfidence(best.score),
    };
  });

  return {
    output: { matches },
    tokens: 0,
  };
}