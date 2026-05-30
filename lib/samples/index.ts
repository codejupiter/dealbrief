/**
 * lib/samples/index.ts
 *
 * Central registry of all sample transcripts. The UI imports from here.
 *
 * For v1, three samples cover the most useful demo cases:
 * 1. Price objection (medium) — most common deal shape
 * 2. Easy close — tests the pipeline doesn't fabricate problems
 * 3. Compliance landmine — shows the compliance step doing real work
 *
 * Two more samples (political, ambiguous) are in the spec but cut from v1 to
 * ship faster. The pattern is established; adding more is mechanical.
 */

import { sample_price_objection } from './price_objection';
import { sample_easy_close } from './easy_close';
import { sample_compliance_landmine } from './compliance_landmine';

export interface Sample {
  id: string;
  label: string;
  description: string;
  transcript: string;
}

export const SAMPLES: Sample[] = [
  sample_price_objection,
  sample_easy_close,
  sample_compliance_landmine,
];
