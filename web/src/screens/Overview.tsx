/**
 * Overview — three money cards (one per agent phase), the North Star chart
 * (OTA share today → projected), a real breakdown of where this month's
 * exposure sits, and the documents the agent has loaded. This is where the
 * agent's output lands; it is not the product.
 */
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getJson, mxn, useAuditStream } from '../lib/useAuditStream';
import { useCountUp } from '../lib/animate';
import { PageHeader } from '../components/PageHeader';
import { Icon, type IconName } from '../components/Icon';
import { AgentAvatar } from '../components/AgentAvatar';

type ReportData = {
  prevented_today: number; disputable_month: number; verify_pending: number;
  recoverable_monthly: number; repeat_guests: number;
  ota_share_today: number; ota_share_projected: number; annual_savings: number;
};
type Dispute = { id: number; decision: string; amount: number; status: string };

const DOCUMENTS = [
  { id: 'BKG', name: 'Booking contract', status: 'PARSED' },
  { id: 'EXP', name: 'Expedia contract', status: 'PARSED' },
  { id: 'POL', name: 'Hotel policies', status: 'INDEXED' },
  { id: 'LAD', name: 'Benefit ladder', status: 'INDEXED' },
  { id: 'PMS', name: 'PMS reservations', status: 'SYNCED' },
  { id: 'LOG', name: 'OTA extranet logs', status: 'SYNCED' },
];
const STATUS_CLS: Record<string, string> = { PARSED: 'pill-plan', INDEXED: 'pill-tool', SYNCED: 'pill-money' };

export function Overview() {
  const { running } = useAuditStream();
  const [r, setR] = useState<ReportData | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  useEffect(() => { getJson<ReportData>('/api/report').then(setR).catch(console.error); }, [running]);
  useEffect(() => { getJson<Dispute[]>('/api/disputes').then(setDisputes).catch(console.error); }, [running]);

  const shareData = r ? [
    { label: 'Today', value: r.ota_share_today },
    { label: 'Projected', value: r.ota_share_projected },
  ] : [];

  const exposureByType = useMemo(() => {
    const groups: Record<string, { label: string; color: string }> = {
      AT_RISK: { label: 'At risk', color: 'var(--color-ember)' },
      DISPUTABLE: { label: 'Disputable', color: 'var(--color-money)' },
      VERIFY: { label: 'Verify', color: 'var(--color-verify)' },
    };
    return Object.entries(groups).map(([decision, g]) => ({
      ...g,
      value: disputes.filter((d) => d.decision === decision && d.status === 'open').reduce((s, d) => s + d.amount, 0),
    }));
  }, [disputes]);

  const foundThisMonth = r ? r.disputable_month + r.verify_pending : null;
  const animatedFound = useCountUp(foundThisMonth);
  const foundCount = disputes.filter((d) => d.status === 'open' && (d.decision === 'DISPUTABLE' || d.decision === 'VERIFY')).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" />

      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyCard
          icon="alert" tone="ember"
          label="At risk today"
          tooltip="Sentinel runs a daily sweep of yesterday's activity, before the OTA invoices it — this is money you can still stop."
          value={r?.prevented_today}
          detail="Sentinel detected · window closing"
        />
        <MoneyCard
          icon="clock" tone="verify"
          label="Disputable this month"
          tooltip="The Auditor reconciles this month's invoice line-by-line against the OTA contracts — money already billed that you can claim back."
          value={r?.disputable_month}
          detail={r ? `+ ${mxn(r.verify_pending)} pending verification` : 'found line-by-line vs contracts'}
        />
        <MoneyCard
          icon="trend-up" tone="money"
          label="Recoverable every month"
          tooltip="Win-Back finds loyal guests who still pay OTA commission out of habit — commission you'd stop paying if they booked direct."
          value={r?.recoverable_monthly}
          detail={`${r?.repeat_guests ?? 0} repeat guests still booking via OTA`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel p-5">
          <h2 className="font-serif text-base font-bold text-slate-900">North Star — OTA Dependency</h2>
          <p className="mb-4 text-sm text-slate-500">Reducing platform dependency as Win-Back offers land.</p>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <Stat label="Today" value={r ? `${r.ota_share_today}%` : '—'} />
            <Icon name="arrow-right" className="text-slate-300" />
            <Stat label="Projected" value={r ? `${r.ota_share_projected}%` : '—'} tone="money" />
            <span className="pill pill-money ml-auto">Annual savings {r ? mxn(r.annual_savings) : '—'} MXN</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shareData} margin={{ left: 4, right: 24, top: 8 }}>
                <CartesianGrid strokeDasharray="3 5" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9a9078', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#c3b896' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'OTA share']} contentStyle={{ borderRadius: 10, borderColor: 'var(--color-line)', fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="var(--color-money)" strokeWidth={2.5} dot={{ r: 5, fill: 'var(--color-money)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <h2 className="mb-1 font-serif text-base font-bold text-slate-900">Documents loaded</h2>
          <p className="mb-4 text-sm text-slate-500">What the agent reads before it decides anything.</p>
          <ul className="flex-1 space-y-2">
            {DOCUMENTS.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon name="file" width={15} height={15} className="text-slate-400" />{d.name}</span>
                <span className={`pill ${STATUS_CLS[d.status]}`}>{d.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="panel flex items-center gap-4 p-5">
          <AgentAvatar size="md" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Found by Clawback this month</div>
            {animatedFound == null ? (
              <div className="skeleton mt-1 h-8 w-28 rounded-md" />
            ) : (
              <div className="font-mono text-2xl font-extrabold text-[var(--color-gold)]">{mxn(animatedFound)}</div>
            )}
            <div className="mt-0.5 text-xs text-slate-500">across {foundCount} open finding{foundCount === 1 ? '' : 's'}</div>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-serif text-base font-bold text-slate-900">Exposure by finding type</h2>
          <p className="mb-3 text-sm text-slate-500">Where this month's money is sitting, from real audit findings.</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposureByType} layout="vertical" margin={{ left: 8, right: 32 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 12, fill: '#57503f', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [mxn(v), 'Amount']} contentStyle={{ borderRadius: 10, borderColor: 'var(--color-line)', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                  {exposureByType.map((d) => <Cell key={d.label} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'money' }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-mono text-2xl font-extrabold ${tone === 'money' ? 'text-[var(--color-money)]' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

function MoneyCard({ icon, tone, label, tooltip, value, detail }: { icon: IconName; tone: 'ember' | 'money' | 'verify'; label: string; tooltip: string; value: number | undefined; detail: string }) {
  const toneCls = { ember: 'text-[var(--color-ember)] bg-[var(--color-ember-soft)]', money: 'text-[var(--color-money)] bg-[var(--color-money-soft)]', verify: 'text-[var(--color-verify)] bg-[var(--color-verify-soft)]' }[tone];
  const numCls = { ember: 'text-[var(--color-ember)]', money: 'text-[var(--color-money)]', verify: 'text-[var(--color-verify)]' }[tone];
  const animated = useCountUp(value ?? null);
  return (
    <div className="panel p-5 transition-shadow hover:shadow-md" title={tooltip}>
      <div className="mb-3 flex items-start justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneCls}`}><Icon name={icon} width={15} height={15} /></span>
      </div>
      {animated == null ? (
        <div className="skeleton h-8 w-32 rounded-md" />
      ) : (
        <div className={`font-mono text-2xl font-extrabold tabular-nums ${numCls}`}>{mxn(animated)} <span className="text-sm font-bold">MXN</span></div>
      )}
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}
