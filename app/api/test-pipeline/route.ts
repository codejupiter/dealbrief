/**
 * app/api/test-pipeline/route.ts
 *
 * Updated to test extract + classify + crossref + compliance together.
 * Visit http://localhost:3000/api/test-pipeline
 *
 * Compliance runs alongside classify conceptually (both analyze the same
 * transcript), but for simplicity v1 runs them sequentially. The orchestrator
 * in v2 could parallelize compliance with extract, since neither depends on
 * the other's output.
 */

import { NextResponse } from 'next/server';
import { runExtract } from '@/lib/steps/extract';
import { runClassify } from '@/lib/steps/classify';
import { runCrossref } from '@/lib/steps/crossref';
import { runCompliance } from '@/lib/steps/compliance';
import { sample_price_objection } from '@/lib/samples/price_objection';

export async function GET() {
  try {
    const transcript = sample_price_objection.transcript;
    const overallStart = Date.now();

    // Step 1
    const extractStart = Date.now();
    const extracted = await runExtract(transcript);
    const extractLatency = Date.now() - extractStart;

    // Step 2
    const classifyStart = Date.now();
    const classified = await runClassify(transcript, extracted.output);
    const classifyLatency = Date.now() - classifyStart;

    // Step 3
    const crossrefStart = Date.now();
    const crossref = await runCrossref(classified.output);
    const crossrefLatency = Date.now() - crossrefStart;

    // Step 4
    const complianceStart = Date.now();
    const compliance = await runCompliance(transcript);
    const complianceLatency = Date.now() - complianceStart;

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
        crossref: {
          latency_ms: crossrefLatency,
          tokens: crossref.tokens,
          output: crossref.output,
        },
        compliance: {
          latency_ms: complianceLatency,
          tokens: compliance.tokens,
          output: compliance.output,
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