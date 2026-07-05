/**
 * Small channel indicator (Booking / Expedia / direct) — lets a manager scan
 * a table and see at a glance which OTA a finding or guest belongs to,
 * without adding a new column.
 */
const OTAS: Record<string, { label: string; letter: string; cls: string }> = {
  booking: { label: 'Booking', letter: 'B', cls: 'bg-[#003b95] text-white' },
  expedia: { label: 'Expedia', letter: 'E', cls: 'bg-[#fbbc04] text-[#5c4400]' },
  direct: { label: 'Direct', letter: 'D', cls: 'bg-slate-200 text-slate-600' },
};

export function OtaBadge({ channel, className = '' }: { channel: string; className?: string }) {
  const key = channel?.toLowerCase();
  const m = OTAS[key] ?? { label: channel, letter: channel?.[0]?.toUpperCase() ?? '?', cls: 'bg-slate-200 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 ${className}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-[4px] text-[9px] font-extrabold ${m.cls}`}>{m.letter}</span>
      {m.label}
    </span>
  );
}
