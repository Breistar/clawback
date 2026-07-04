import { Icon } from './Icon';
import { useAuditStream } from '../lib/useAuditStream';

/** Global floating action — one button, always reachable, matches the reference's persistent CTA instead of a per-screen duplicate. */
export function RunAuditButton({ onRun }: { onRun?: () => void }) {
  const { runAudit, running } = useAuditStream();
  return (
    <button
      onClick={() => { runAudit(); onRun?.(); }}
      disabled={running}
      className="tap fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 disabled:opacity-60"
    >
      <Icon name="claw" width={16} height={16} className="text-[var(--color-gold)]" />
      {running ? 'Audit running…' : 'Run Full Audit'}
    </button>
  );
}
