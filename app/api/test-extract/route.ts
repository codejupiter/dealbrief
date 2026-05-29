/**
 * app/api/test-extract/route.ts
 *
 * Tiny test endpoint to verify the extract step works end-to-end.
 * Visit http://localhost:3000/api/test-extract to see the structured output
 * for the price-objection sample transcript.
 *
 * This is a TEMPORARY file. Delete it (and the folder) once the full pipeline
 * is wired up — by then you'll be testing through the real UI.
 */

import { NextResponse } from 'next/server';
import { runExtract } from '@/lib/steps/extract';
import { sample_price_objection } from '@/lib/samples/price_objection';

export async function GET() {
  try {
    const start = Date.now();
    const result = await runExtract(sample_price_objection.transcript);
    const elapsed = Date.now() - start;

    return NextResponse.json({
      success: true,
      latency_ms: elapsed,
      tokens: result.tokens,
      output: result.output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
