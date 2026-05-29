/**
 * app/api/test-pipeline/route.ts
 *
 * Tests extract + classify together to verify they chain correctly.
 * Visit http://localhost:3000/api/test-pipeline
 *
 * Once classify works against extract's output, the pattern is proven —
 * compliance and synthesize will follow the same shape.
 */

import { NextResponse } from 'next/server';
import { runExtract } from '@/lib/steps/extract';
import { runClassify } from '@/lib/steps/classify';
import { sample_price_objection } from '@/lib/samples/price_objection';

export async function GET() {
  try {
    const transcript = sample_price_objection.transcript;
    const overallStart = Date.now();

    // Step 1
    const extractStart = Date.now();
    const extracted = await runExtract(transcript);
    const extractLatency = Date.now() - extractStart;

    // Step 2 — uses step 1's output as context
    const classifyStart = Date.now();
    const classified = await runClassify(transcript, extracted.output);
    const classifyLatency = Date.now() - classifyStart;

    return NextResponse.json({
      success: true,
      total_latency_ms: Date.now() - overallStart,
      steps: {
        extract: {
          latency_ms: extractLatency,
          tokens: extracted.tokens,
          output: extracted.output,
        },
        classify: {
          latency_ms: classifyLatency,
          tokens: classified.tokens,
          output: classified.output,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}