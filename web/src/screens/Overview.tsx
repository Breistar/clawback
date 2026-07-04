/**
 * Overview — three money cards (one per agent phase), the North Star chart
 * (OTA share today → projected + annual savings) and the documents the agent
 * has loaded. This is where the agent's output lands; it is not the product.
 */
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getJson, mxn, useAuditStream } from '../lib/useAuditStream';
import { useCountUp } from '../lib/animate';

type ReportData = {
  prevented_today: number; disputable_month: number; verify_pending: number;
  recoverable_monthly: number; repeat_guests: number;
  ota_share_today: number; ota_share_projected: number; annual_savings: number;
};

const DOCUMENTS = [
  { id: 'BKG', name: 'Booking contract', status: 'PARSED' },
  { id: 'EXP', name: 'Expedia contract', status: 'PARSED' },
  { id: 'POL', name: 'Hotel policies', status: 'INDEXED' },
  { id: 'LAD', name: 'Benefit ladder', status: 'INDEXED' },
  { id: 'PMS', name: 'PMS reservations', status: 'SYNCED' },
  { id: 'LOG', name: 'OTA extranet logs', status: 'SYNCED' },
];
const STATUS_CLS: Record<string, string> = { PARSED: 'pill-plan', INDEXED: 'pill-tool', SYNCED: 'pill-money' };

export function Overview({ onRun }: { onRun: () => void }) {
  const { runAudit, running } = useAuditStream();
  const [r, setR] = useState<ReportData | null>(null);
  useEffect(() => { getJson<ReportData>('/api/report').then(setR).catch(console.error); }, [running]);

  const chartData = r ? [
    { label: 'Today', value: r.ota_share_today, fill: 'var(--color-ember)' },
    { label: 'Projected', value: r.ota_share_projected, fill: 'var(--color-money)' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyCard
          tone="ember"
          eyebrow="Sentinel · At risk TODAY"
          tooltip="Sentinel runs a daily sweep of yesterday's activity, before the OTA invoices it — this is money you can still stop."
          value={r?.prevented_today}
          detail="Unmarked events caught before invoicing — window closing"
          urgent
        />
        <MoneyCard
          tone="money"
          eyebrow="Auditor · Disputable this month"
          tooltip="The Auditor reconciles this month's invoice line-by-line against the OTA contracts — money already billed that you can claim back."
          value={r?.disputable_month}
          detail={r ? `+ ${mxn(r.verify_pending)} pending verification` : 'found line-by-line vs contracts'}
        />
        <MoneyCard
          tone="plan"
          eyebrow="Win-Back · Recoverable every month"
          tooltip="Win-Back finds loyal guests who still pay OTA commission out of habit — commission you'd stop paying if they booked direct."
          value={r?.recoverable_monthly}
          detail={`${r?.repeat_guests ?? 0} repeat guests still booking via OTA`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel p-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">North Star — OTA dependency</h2>
            <span className="font-mono text-xs text-slate-400">annual savings {r ? mxn(r.annual_savings) : '—'} MXN</span>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            OTA share of stays, today vs. projected once Win-Back offers land.
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-line)" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 13, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'OTA share']} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                  {chartData.map((d) => <Cell key={d.label} fill={d.fill} />)}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Documents loaded</h2>
          <p className="mb-4 text-sm text-slate-500">What the agent reads before it decides anything.</p>
          <ul className="flex-1 space-y-2">
            {DOCUMENTS.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{d.name}</span>
                <span className={`pill ${STATUS_CLS[d.status]}`}>{d.status}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => { runAudit(); onRun(); }}
            disabled={running}
            className="tap mt-4 w-full rounded-xl bg-[var(--color-ember)] px-4 py-3 text-sm font-bold text-white shadow-sm shadow-orange-900/10 transition-opacity disabled:opacity-60"
          >
            {running ? 'Audit running…' : '▶ Run Full Audit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoneyCard({ tone, eyebrow, tooltip, value, detail, urgent }: { tone: 'ember' | 'money' | 'plan'; eyebrow: string; tooltip: string; value: number | undefined; detail: string; urgent?: boolean }) {
  const border = { ember: 'border-t-[var(--color-ember)]', money: 'border-t-[var(--color-money)]', plan: 'border-t-[var(--color-plan)]' }[tone];
  const animated = useCountUp(value ?? null);
  return (
    <div className={`panel border-t-4 ${border} p-5 transition-shadow hover:shadow-md`} title={tooltip}>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {urgent && <span className="pulse-dot" />}
        {eyebrow}
      </div>
      {animated == null ? (
        <div className="skeleton h-9 w-32 rounded-md" />
      ) : (
        <div className="text-3xl font-extrabold tabular-nums text-slate-900">{mxn(animated)}</div>
      )}
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}
