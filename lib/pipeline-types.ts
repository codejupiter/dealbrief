/**
 * lib/pipeline-types.ts
 *
 * Shared types between the UI and the streaming API. Lives outside lib/steps/
 * so it can be imported from client components without dragging in the AI SDK.
 */

export type StepId = 'extract' | 'classify' | 'crossref' | 'compliance' | 'synthesize';

export type StepStatus = 'idle' | 'running' | 'complete' | 'error';

export interface StepState {
  status: StepStatus;
  latencyMs: number | null;
  tokens: number | null;
  error?: string;
}

export interface StepMeta {
  id: StepId;
  number: number;
  label: string;
  description: string;
}

export const STEP_META: StepMeta[] = [
  {
    id: 'extract',
    number: 1,
    label: 'Extract',
    description: 'Pull entities from the transcript',
  },
  {
    id: 'classify',
    number: 2,
    label: 'Classify',
    description: 'Categorize objections and buying signals',
  },
  {
    id: 'crossref',
    number: 3,
    label: 'Cross-reference',
    description: 'Match objections against playbook',
  },
  {
    id: 'compliance',
    number: 4,
    label: 'Compliance',
    description: 'Scan for legal and trust flags',
  },
  {
    id: 'synthesize',
    number: 5,
    label: 'Synthesize',
    description: 'Generate the deal brief',
  },
];
