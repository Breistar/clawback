/**
 * Agent — the glass brain. Every plan, retrieval, tool call and decision the
 * agent makes streams here live over SSE, each visually coded so the judging
 * proof points (plans, retrieves more than once, calls tools, decides) read
 * at a glance without reading a word.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuditStream, type AgentEvent } from '../lib/useAuditStream';
import { EventTypePill } from '../components/Pill';
import { DocumentPanel } from '../components/DocumentPanel';

export function Agent() {
  const { events, running, runAudit } = useAuditStream();
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 space-y-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Live reasoning feed</h2>
          <button onClick={runAudit} disabled={running} className="tap rounded-full bg-[var(--color-ember)] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-60">
            {running ? 'Running…' : '▶ Run Full Audit'}
          </button>
        </div>

        {events.length === 0 && (
          <div className="panel flex flex-col items-center gap-2 px-6 py-16 text-center text-slate-400">
            <span className="text-3xl">🧠</span>
            <p className="text-sm">The agent is idle. Run a full audit to watch it plan, retrieve, reason and decide in real time.</p>
          </div>
        )}

        <div className="space-y-2">
          {events.map((e, i) => (e.type === 'phase' ? <PhaseDivider key={i} text={e.text} /> : <EventRow key={i} e={e} onCitation={setOpenDoc} />))}
        </div>
        <div ref={endRef} />
      </div>

      {openDoc && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          <DocumentPanel id={openDoc} onClose={() => setOpenDoc(null)} />
        </div>
      )}
    </div>
  );
}

function PhaseDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 pb-1 pt-4 first:pt-0">
      <span className="whitespace-nowrap text-xs font-extrabold uppercase tracking-widest text-slate-400">— {text} —</span>
      <div className="h-px flex-1 bg-[var(--color-line)]" />
    </div>
  );
}

function decisionTone(text: string): string {
  const t = text.toUpperCase();
  if (t.includes('NOT_DISPUTABLE')) return 'decision-neutral';
  if (t.includes('DISPUTABLE') || t.includes('RULE LEARNED')) return 'decision-positive';
  if (t.includes('AT_RISK') || t.includes('VERIFY')) return 'decision-risk';
  return 'decision-positive';
}

function EventRow({ e, onCitation }: { e: AgentEvent; onCitation: (id: string) => void }) {
  const dataType = e.type === 'decision' ? decisionTone(e.text) : e.type;
  return (
    <div className="feed-row flex items-start gap-3" data-type={dataType}>
      <div className="mt-0.5"><EventTypePill type={e.type} /></div>
      <div className="min-w-0 flex-1 text-sm leading-snug text-slate-700">
        {e.text}
        {e.amount != null && e.amount > 0 && <span className="ml-2 font-mono font-bold text-slate-900">${e.amount.toLocaleString('en-US')}</span>}
        {!!e.citations?.length && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {e.citations.map((c) => (
              <button key={c} onClick={() => onCitation(c)} className="chip">{c}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}