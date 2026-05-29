/**
 * app/api/test-synthesize/route.ts
 *
 * Tests the full pipeline end-to-end, with synthesis streaming.
 * Visit http://localhost:3000/api/test-synthesize
 *
 * This route is different from test-pipeline:
 *   - test-pipeline returns JSON with all step outputs (good for debugging)
 *   - test-synthesize STREAMS the final brief to the browser (good for
 *     verifying the synthesis step's streaming behavior works end-to-end)
 *
 * When you hit this URL, you'll see the markdown brief render token-by-token
 * directly in the browser. That's the experience the user will get when the
 * real UI is built.
 *
 * Both routes coexist during development. Once the UI is built, both get
 * replaced by app/api/pipeline/route.ts which streams everything together.
 */

import { runExtract } from '@/lib/steps/extract';
import { runClassify } from '@/lib/steps/classify';
import { runCrossref } from '@/lib/steps/crossref';
import { runCompliance } from '@/lib/steps/compliance';
import { runSynthesize } from '@/lib/steps/synthesize';
import { sample_price_objection } from '@/lib/samples/price_objection';

export async function GET() {
  const transcript = sample_price_objection.transcript;

  // Run steps 1–4 sequentially. The user is staring at a loading state
  // during this; in the real pipeline, we'll emit step-level events to the
  // UI so they see the progress.
  const extracted = await runExtract(transcript);
  const classified = await runClassify(transcript, extracted.output);
  const crossref = await runCrossref(classified.output);
  const compliance = await runCompliance(transcript);

  // Step 5: synthesis streams.
  const result = await runSynthesize({
    transcript,
    extracted: extracted.output,
    classified: classified.output,
    crossref: crossref.output,
    compliance: compliance.output,
  });

  // toTextStreamResponse() is the AI SDK's helper for streaming markdown
  // back as plain text. The browser renders it as it arrives.
  return result.toTextStreamResponse();
}