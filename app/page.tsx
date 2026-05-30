/**
 * app/page.tsx
 *
 * Main dealbrief UI. Three-pane layout:
 *   - Left: transcript input with sample loader (sticky)
 *   - Right top: pipeline progress (5 step cards)
 *   - Right bottom: final brief (streamed markdown)
 *
 * Layout: left column is sticky at viewport height. The brief on the right
 * can grow tall without dragging the transcript pane with it — independent
 * scroll for each side.
 */

'use client';

import { useState } from 'react';
import { SAMPLES } from '@/lib/samples';
import { usePipeline } from '@/lib/use-pipeline';
import { TranscriptInput } from '@/components/TranscriptInput';
import { Pipeline } from '@/components/Pipeline';
import { Brief } from '@/components/Brief';
import { Header } from '@/components/Header';

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const { steps, brief, isRunning, error, totals, run, reset } = usePipeline();

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLES.find((s) => s.id === sampleId);
    if (sample) {
      setTranscript(sample.transcript);
      reset();
    }
  };

  const handleGenerate = () => {
    if (!transcript.trim()) return;
    void run(transcript);
  };

  const handleReset = () => {
    setTranscript('');
    reset();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 px-6 lg:px-10 py-8 max-w-[1600px] mx-auto w-full items-start">
        {/* LEFT — sticky transcript input.
            top-8 matches main's py-8 so it aligns when scrolled.
            max-h calc keeps it within the viewport minus header + padding. */}
        <section className="lg:sticky lg:top-8 flex flex-col gap-4 lg:max-h-[calc(100vh-7rem)]">
          <TranscriptInput
            value={transcript}
            onChange={setTranscript}
            onLoadSample={handleLoadSample}
            onGenerate={handleGenerate}
            onReset={handleReset}
            isRunning={isRunning}
            samples={SAMPLES}
          />
        </section>

        {/* RIGHT — pipeline + brief stack. Grows naturally with content. */}
        <section className="flex flex-col gap-6 min-w-0">
          <Pipeline steps={steps} totals={totals} isRunning={isRunning} />
          {error && <ErrorBanner error={error} />}
          <Brief content={brief} isRunning={isRunning} />
        </section>
      </main>
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm"
      style={{
        background: 'hsla(var(--danger-muted), 0.4)',
        border: '1px solid hsla(var(--danger), 0.3)',
        color: 'hsl(var(--danger))',
      }}
    >
      <span className="font-medium">Pipeline error: </span>
      {error}
    </div>
  );
}
