/**
 * Margin Report — the executive one-pager. Mostly assembled from data other
 * screens already show; the only new thing here is the framing: what to do
 * next, in order, with a number attached to each line.
 */
import { useEffect, useState } from 'react';
import { getJson, mxn, useAuditStream } from '../lib/useAuditStream';
import { useCountUp } from '../lib/animate';
import { DecisionPill } from '../components/Pill';
import { PageHeader } from '../components/PageHeader';

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

  if (!r) {
    return (
      <div className="space-y-4">
        <PageHeader title="Report" />
        <div className="panel px-6 py-16 text-center text-sm text-slate-400">Run a full audit to generate the report.</div>
      </div>
    );
  }

  const actions = [
    ...disputes.filter((d) => d.status === 'open' && (d.decision === 'AT_RISK' || d.decision === 'DISPUTABLE')).map((d) => ({
      text: d.decision === 'AT_RISK' ? `Mark reservation #${d.reservation_id} on the OTA extranet before the window closes.` : `File dispute for reservation #${d.reservation_id} — ${d.finding}`,
      amount: d.amount,
      decision: d.decision,
    })),
    ...offers.map((o) => ({ text: `Send the win-back offer to ${o.guest_name} (${o.segment.toLowerCase()}).`, amount: o.burned_per_visit, decision: 'WIN_BACK' as const })),
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Report" />

      <div className="panel p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">Margin Report</p>
        <h2 className="mt-1 font-serif text-xl font-bold text-slate-900">Hotel Casa Alaria</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Your OTA relationship is leaking money in three places. The Sentinel prevented{' '}
          <b className="font-mono font-bold text-[var(--color-ember)]">{mxn(r.prevented_today)} MXN</b> today,{' '}
          <b className="font-mono font-bold text-[var(--color-verify)]">{mxn(r.disputable_month)}</b> is disputable this month —
          the window is closing. Converting repeat guests to direct booking saves{' '}
          <b className="font-mono font-bold text-[var(--color-money)]">{mxn(r.recoverable_monthly)}</b> every month.
        </p>

        <div className="mt-4 rounded-xl bg-[var(--color-gold-soft)] px-6 py-4 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">Combined quarterly impact</div>
          <div className="mt-1 font-mono text-3xl font-extrabold text-slate-900 sm:text-4xl">{mxn(animatedQuarterly ?? quarterly ?? 0)} <span className="text-base font-bold text-slate-500">MXN</span></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-line)] pt-3 sm:grid-cols-4">
          <ReportStat label="Prevented today" value={r.prevented_today} />
          <ReportStat label="Disputable this month" value={r.disputable_month} />
          <ReportStat label="Pending verification" value={r.verify_pending} />
          <ReportStat label="Recoverable / month" value={r.recoverable_monthly} />
        </div>

        <p className="mt-3 text-xs text-slate-400">North Star: OTA share {r.ota_share_today}% → {r.ota_share_projected}% in 6 months · {mxn(r.annual_savings)} MXN / year.</p>
      </div>

      <div className="panel p-5 pb-16">
        <h2 className="mb-3 font-serif text-base font-bold text-slate-900">Recommended actions</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-400">No open actions — run a full audit to generate findings.</p>
        ) : (
          <ol className="space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-[var(--color-line)] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold-soft)] text-xs font-bold text-[var(--color-gold)]">{i + 1}</span>
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
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-slate-900">{mxn(animated ?? value)}</div>
    </div>
  );
}
