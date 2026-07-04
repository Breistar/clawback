/**
 * Win-Back — repeat guests still booking via OTAs, found by RFM, converted
 * with a personalized direct-booking offer built from the benefit ladder.
 * Commission burned is the number that makes this screen's case: money paid
 * on guests who never needed convincing.
 */
import { useEffect, useState } from 'react';
import { getJson, mxn, useAuditStream } from '../lib/useAuditStream';
import { SegmentPill } from '../components/Pill';
import { Avatar } from '../components/Avatar';
import { OtaBadge } from '../components/OtaBadge';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';

type Offer = {
  id: number; guest_name: string; guest_notes: string | null; segment: string; r_days: number; f_stays: number;
  m_avg: number; channel: string; burned_per_visit: number; burned_per_year: number; offer_md: string;
};

export function WinBack() {
  const { running } = useAuditStream();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  useEffect(() => { getJson<Offer[]>('/api/winback').then(setOffers).catch(console.error); }, [running]);

  const potentialSavings = offers.filter((o) => !approved.has(o.id)).reduce((s, o) => s + o.burned_per_year / 12, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Win-Back" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="users" tone="verify" label="Repeat guests via OTA" value={String(offers.length)} />
        <StatCard icon="check" tone="money" label="Converted to direct" value={String(approved.size)} />
        <StatCard icon="trend-up" tone="gold" label="Potential monthly savings" value={`${mxn(potentialSavings)} MXN`} />
      </div>

      <div>
        <h2 className="font-serif text-base font-bold text-slate-900">Repeat guests still booking via OTA</h2>
        <p className="text-xs text-slate-500">Segmented by RFM over 18 months. Source: hotel's own PMS guest records — no external data.</p>
      </div>

      {offers.length === 0 && (
        <div className="panel px-6 py-16 text-center text-sm text-slate-400">No offers yet — run a full audit from Overview or Agent.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((o) => (
          <OfferCard key={o.id} o={o} approved={approved.has(o.id)} onApprove={() => setApproved((s) => new Set(s).add(o.id))} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, tone, label, value }: { icon: 'users' | 'check' | 'trend-up'; tone: 'verify' | 'money' | 'gold'; label: string; value: string }) {
  const toneCls = { verify: 'text-[var(--color-verify)] bg-[var(--color-verify-soft)]', money: 'text-[var(--color-money)] bg-[var(--color-money-soft)]', gold: 'text-[var(--color-gold)] bg-[var(--color-gold-soft)]' }[tone];
  const numCls = { verify: 'text-slate-900', money: 'text-slate-900', gold: 'text-[var(--color-gold)]' }[tone];
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneCls}`}><Icon name={icon} width={15} height={15} /></span>
      </div>
      <div className={`font-mono text-2xl font-extrabold ${numCls}`}>{value}</div>
    </div>
  );
}

function OfferCard({ o, approved, onApprove }: { o: Offer; approved: boolean; onApprove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(o.offer_md);

  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-start gap-3">
        <Avatar name={o.guest_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-slate-900">{o.guest_name}</span>
            <SegmentPill segment={o.segment} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-slate-400">
            <span>R {o.r_days}d · F {o.f_stays}× · M {mxn(o.m_avg)}</span>
            <OtaBadge channel={o.channel} />
          </div>
        </div>
      </div>

      {o.guest_notes && <p className="mt-2 text-xs italic text-slate-400">"{o.guest_notes}"</p>}

      <div className="mt-3 rounded-lg bg-[var(--color-ember-soft)] px-3 py-2 text-sm">
        <span className="font-bold text-[var(--color-ember)]">Commission burned:</span>{' '}
        <span className="text-slate-700">{mxn(o.burned_per_visit)}/visit · ~{mxn(o.burned_per_year)}/year</span>
      </div>

      <div className="mt-3 flex-1">
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--color-line)] p-2 text-sm text-slate-700 focus:border-[var(--color-gold)] focus:outline-none"
          />
        ) : (
          <p className="text-sm leading-relaxed text-slate-700">{text}</p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onApprove}
          disabled={approved}
          className="tap flex-1 rounded-lg bg-[var(--color-money)] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {approved ? '✓ Approved' : '✓ Approve message'}
        </button>
        <button
          onClick={() => setEditing((e) => !e)}
          className="tap rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-bold text-slate-600"
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>
    </div>
  );
}
