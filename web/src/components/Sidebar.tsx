/**
 * Left sidebar — replaces the old top nav. Carries the brand, the six
 * screens, and two pieces of always-visible context: how many open findings
 * need attention, and the single most urgent one (mirrors the reference
 * aesthetic's "you are never more than a glance from the risk").
 */
import { useEffect, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { getJson, useAuditStream } from '../lib/useAuditStream';
import { useCountdown } from '../lib/countdown';

export const SCREENS = ['Overview', 'Agent', 'Disputes', 'Win-Back', 'Report', 'Chat'] as const;
export type Screen = (typeof SCREENS)[number];

const NAV: { screen: Screen; icon: IconName }[] = [
  { screen: 'Overview', icon: 'grid' },
  { screen: 'Agent', icon: 'brain' },
  { screen: 'Disputes', icon: 'alert' },
  { screen: 'Win-Back', icon: 'users' },
  { screen: 'Report', icon: 'chart' },
  { screen: 'Chat', icon: 'chat' },
];

type Dispute = { id: number; reservation_id: number; ota: string; decision: string; status: string; window_deadline: string | null };

export function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const { running } = useAuditStream();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  useEffect(() => { getJson<Dispute[]>('/api/disputes').then(setDisputes).catch(() => {}); }, [running]);

  const openCount = disputes.filter((d) => d.status === 'open').length;
  const urgent = disputes.find((d) => d.decision === 'AT_RISK' && d.status === 'open' && d.window_deadline);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-[var(--color-ink)] text-white/70">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold)] font-serif text-sm font-bold text-[var(--color-ink)]">C</span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-extrabold text-white">
            Claw<span className="text-[var(--color-gold)]">back</span>
          </div>
          <div className="truncate text-[11px] text-white/40">Hotel Casa Alaria</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ screen: s, icon }) => {
          const active = s === screen;
          return (
            <button
              key={s}
              onClick={() => setScreen(s)}
              className={`tap flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                active ? 'bg-white/10 text-white ring-1 ring-[var(--color-gold)]/50' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon name={icon} className={active ? 'text-[var(--color-gold)]' : ''} />
              <span className="flex-1">{s}</span>
              {s === 'Disputes' && openCount > 0 && (
                <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-ember)] px-1 text-[10px] font-bold text-white">
                  {openCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        {urgent && <UrgentCard dispute={urgent} onGo={() => setScreen('Disputes')} />}
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/10 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold-soft)] text-xs font-bold text-[var(--color-gold)]">AM</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-white">Ana Morales</div>
          <div className="truncate text-[11px] text-white/40">Revenue Manager</div>
        </div>
        <Icon name="settings" className="shrink-0 text-white/30" />
      </div>
    </aside>
  );
}

function UrgentCard({ dispute, onGo }: { dispute: Dispute; onGo: () => void }) {
  const c = useCountdown(dispute.window_deadline);
  return (
    <button onClick={onGo} className="tap block w-full rounded-lg border border-[var(--color-ember)]/40 bg-[var(--color-ember)]/15 p-3 text-left">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-ember)]">
        <span className="pulse-dot" /> Urgent {c ? `— ${c.label}` : ''}
      </div>
      <div className="mt-1 text-xs leading-snug text-white/70">
        Reservation #{dispute.reservation_id} pending on the {dispute.ota} extranet
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[var(--color-gold)]">
        Go to Disputes <Icon name="arrow-right" width={13} height={13} />
      </div>
    </button>
  );
}
