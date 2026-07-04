/**
 * Margin Report — the executive one-pager. Mostly assembled from data other
 * screens already show; the only new thing here is the framing: what to do
 * next, in order, with a number attached to each line.
 */
import { useEffect, useState } from 'react';
import { getJson, mxn, useAuditStream } from '../lib/useAuditStream';
import { useCountUp } from '../lib/animate';
import { DecisionPill } from '../components/Pill';

type ReportData = {
  prevented_today: number; disputable_month: number; verify_pending: number;
  recoverable_monthly: number; repeat_guests: number;
  ota_share_today: number; ota_share_projected: number; annual_savings: number;
};
type Dispute = { id: number; reservation_id: number; finding: string; decision: string; amount: number; status: string };
type Offer = { id: number; guest_name: string; segment: string; burned_per_visit: number };

export function Report() {
  const { running } = useAuditStream();
  const [r, setR] = useState<ReportData | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    getJson<ReportData>('/api/report').then(setR).catch(console.error);
    getJson<Dispute[]>('/api/disputes').then(setDisputes).catch(console.error);
    getJson<Offer[]>('/api/winback').then(setOffers).catch(console.error);
  }, [running]);

  const quarterly = r ? r.disputable_month * 3 + r.recoverable_monthly * 3 : null;
  const animatedQuarterly = useCountUp(quarterly);

  if (!r) return <div className="panel px-6 py-16 text-center text-sm text-slate-400">Run a full audit to generate the report.</div>;

  const actions = [
    ...disputes.filter((d) => d.status === 'open' && (d.decision === 'AT_RISK' || d.decision === 'DISPUTABLE')).map((d) => ({
      text: d.decision === 'AT_RISK' ? `Mark reservation #${d.reservation_id} on the OTA extranet before the window closes.` : `File dispute for reservation #${d.reservation_id} — ${d.finding}`,
      amount: d.amount,
      decision: d.decision,
    })),
    ...offers.map((o) => ({ text: `Send the win-back offer to ${o.guest_name} (${o.segment.toLowerCase()}).`, amount: o.burned_per_visit, decision: 'WIN_BACK' as const })),
  ];

  return (
    <div className="space-y-6">
      <div className="panel-ink grid-texture p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-white/50">Margin Report · Hotel Casa Alaria</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <span className="text-4xl font-extrabold tabular-nums sm:text-5xl">{mxn(animatedQuarterly ?? quarterly ?? 0)}</span>
          <span className="pb-1 text-sm text-white/60">projected impact this quarter, MXN</span>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          Prevention + dispute recovery + direct-booking win-back, combined. North Star: OTA share {r.ota_share_today}% today →{' '}
          {r.ota_share_projected}% projected · {mxn(r.annual_savings)} annual savings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <ReportStat label="Prevented today" value={r.prevented_today} />
        <ReportStat label="Disputable this month" value={r.disputable_month} />
        <ReportStat label="Pending verification" value={r.verify_pending} />
        <ReportStat label="Recoverable / month" value={r.recoverable_monthly} />
      </div>

      <div className="panel p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Recommended actions</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-400">No open actions — run a full audit to generate findings.</p>
        ) : (
          <ol className="space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-[var(--color-line)] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{i + 1}</span>
                <span className="flex-1 text-sm text-slate-700">{a.text}</span>
                <DecisionPill decision={a.decision} />
                {a.amount > 0 && <span className="w-20 shrink-0 whitespace-nowrap text-right font-mono text-sm font-bold text-slate-900">{mxn(a.amount)}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  const animated = useCountUp(value);
  return (
    <div className="panel p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{mxn(animated ?? value)}</div>
    </div>
  );
}
