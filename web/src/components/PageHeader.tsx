import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { getJson, useAuditStream } from '../lib/useAuditStream';

const MONTH_YEAR = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

type Dispute = { status: string; decision: string };

export function PageHeader({ title }: { title: string }) {
  const { running } = useAuditStream();
  const [alertCount, setAlertCount] = useState(0);
  useEffect(() => {
    getJson<Dispute[]>('/api/disputes')
      .then((rows) => setAlertCount(rows.filter((d) => d.status === 'open' && (d.decision === 'AT_RISK' || d.decision === 'VERIFY')).length))
      .catch(() => {});
  }, [running]);

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-serif text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-400">Hotel Casa Alaria · {MONTH_YEAR}</p>
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('clawback:nav', { detail: 'Disputes' }))}
        title="View open alerts"
        className="tap relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-paper-raised)] text-slate-500 hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]"
      >
        <Icon name="bell" width={17} height={17} />
        {alertCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-ember)] px-1 text-[10px] font-bold text-white">
            {alertCount}
          </span>
        )}
      </button>
    </div>
  );
}
