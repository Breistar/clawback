/**
 * Agent — the glass brain. Every plan, retrieval, tool call and decision the
 * agent makes streams here live over SSE, each visually coded so the judging
 * proof points (plans, retrieves more than once, calls tools, decides) read
 * at a glance without reading a word.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuditStream, type AgentEvent } from '../lib/useAuditStream';
import { EventTypePill } from '../components/Pill';
import { DocumentPanel } from '../components/DocumentPanel';
import { PageHeader } from '../components/PageHeader';
import { AgentAvatar } from '../components/AgentAvatar';

export function Agent() {
  const { events } = useAuditStream();
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  const stats = useMemo(() => {
    const allCitations = new Set(events.flatMap((e) => e.citations ?? []));
    const scanned = [...allCitations].filter((c) => c.startsWith('PMS-')).length;
    const contracts = new Set([...allCitations].filter((c) => /^(BKG|EXP)-/.test(c)).map((c) => c.slice(0, 3))).size;
    const windows = events.filter((e) => e.type === 'decision' && e.text.toUpperCase().includes('AT_RISK')).length;
    const clauses = [...allCitations].filter((c) => c.includes('§')).length;
    return { scanned, contracts, windows, clauses };
  }, [events]);

  return (
    <div className="space-y-4">
      <PageHeader title="Agent — Clawback" />

      <div className="panel flex flex-wrap items-center gap-4 p-5">
        <AgentAvatar size="md" />
        <div className="flex-1">
          <div className="rounded-2xl rounded-tl-sm bg-[var(--color-ink)] px-4 py-2.5 text-sm text-white/90">
            "Every unaccounted night is money the OTA keeps. I watch so you don't have to."
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Scanned" value={stats.scanned} />
          <MiniStat label="Contracts parsed" value={stats.contracts} />
          <MiniStat label="Windows tracked" value={stats.windows} />
          <MiniStat label="Clauses used" value={stats.clauses} />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-2">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Live reasoning feed</h2>

          {events.length === 0 && (
            <div className="panel flex flex-col items-center gap-2 px-6 py-16 text-center text-slate-400">
              <span className="text-3xl">🦉</span>
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
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--color-gold-soft)] px-3 py-2 text-center">
      <div className="font-mono text-lg font-extrabold text-[var(--color-gold)]">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
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
