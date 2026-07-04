/**
 * Disputes — every finding the Sentinel and Auditor persisted: reservation,
 * amount, decision + confidence (with the reason, not just the label),
 * evidence chips, and the full memo behind a click. D1 vs D4 — same symptom,
 * opposite verdict — is meant to sit side by side here.
 */
import { useEffect, useState } from 'react';
import { getJson, mxn, useAuditStream } from '../lib/useAuditStream';
import { DecisionPill, ConfidencePill } from '../components/Pill';
import { DocumentPanel } from '../components/DocumentPanel';
import { Modal } from '../components/Modal';
import { useCountdown } from '../lib/countdown';

type Dispute = {
  id: number; reservation_id: number; ota: string; finding: string;
  decision: string; confidence: string; confidence_reason: string;
  amount: number; evidence: string[]; memo_md: string | null; window_deadline: string | null; status: string;
};

export function Disputes() {
  const { running } = useAuditStream();
  const [rows, setRows] = useState<Dispute[]>([]);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [memoRow, setMemoRow] = useState<Dispute | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set());

  useEffect(() => { getJson<Dispute[]>('/api/disputes').then(setRows).catch(console.error); }, [running]);

  const atRiskWindow = rows.find((r) => r.decision === 'AT_RISK' && r.window_deadline);

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Findings</h2>
          <p className="text-xs text-slate-500">Booking: 7-day dispute window · Expedia: 14-day dispute window.</p>
        </div>
        {atRiskWindow && <WindowBadge deadline={atRiskWindow.window_deadline} />}
      </div>

      {rows.length === 0 && (
        <div className="panel px-6 py-16 text-center text-sm text-slate-400">No findings yet — run a full audit from Overview or Agent.</div>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Reservation</th>
                <th className="px-4 py-3">Finding</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-[var(--color-line)] align-top last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-slate-800">#{d.reservation_id}</div>
                    <div className="text-xs uppercase text-slate-400">{d.ota}</div>
                    {d.decision === 'AT_RISK' && d.window_deadline && <RowCountdown deadline={d.window_deadline} />}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-700">{d.finding}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-slate-900">{d.amount ? mxn(d.amount) : '—'}</td>
                  <td className="px-4 py-3"><DecisionPill decision={d.decision} /></td>
                  <td className="px-4 py-3" title={d.confidence_reason}>
                    <ConfidencePill confidence={d.confidence} />
                    <div className="mt-1 max-w-[10rem] text-[11px] leading-tight text-slate-400">{d.confidence_reason}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {d.evidence.map((c) => <button key={c} onClick={() => setOpenDoc(c)} className="chip">{c}</button>)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      {d.memo_md && (
                        <button onClick={() => setMemoRow(d)} className="tap text-xs font-bold text-[var(--color-plan)] hover:underline">View memo</button>
                      )}
                      {d.decision === 'AT_RISK' && (
                        <button
                          onClick={() => setMarked((m) => new Set(m).add(d.id))}
                          disabled={marked.has(d.id)}
                          className="tap rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[11px] font-bold text-slate-600 disabled:border-[var(--color-money)] disabled:text-[var(--color-money)]"
                        >
                          {marked.has(d.id) ? '✓ Marked' : 'Mark on extranet'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openDoc && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm p-4 sm:w-96">
          <DocumentPanel id={openDoc} onClose={() => setOpenDoc(null)} />
        </div>
      )}

      {memoRow && (
        <Modal title={`Memo — reservation #${memoRow.reservation_id}`} onClose={() => setMemoRow(null)}>
          <div className="mb-3 flex items-center gap-2">
            <DecisionPill decision={memoRow.decision} />
            <ConfidencePill confidence={memoRow.confidence} />
          </div>
          <p className="whitespace-pre-wrap">{memoRow.memo_md}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {memoRow.evidence.map((c) => <span key={c} className="chip cursor-default">{c}</span>)}
          </div>
        </Modal>
      )}
    </div>
  );
}

function WindowBadge({ deadline }: { deadline: string | null }) {
  const c = useCountdown(deadline);
  if (!c) return null;
  return (
    <div className={`pill ${c.urgent ? 'pill-ember' : 'pill-neutral'}`}>
      {c.urgent && <span className="pulse-dot" />} Sentinel window · {c.label}
    </div>
  );
}

function RowCountdown({ deadline }: { deadline: string }) {
  const c = useCountdown(deadline);
  if (!c) return null;
  return <div className={`mt-1 text-[11px] font-bold ${c.expired ? 'text-slate-400' : 'text-[var(--color-ember)]'}`}>{c.label}</div>;
}
