import { useEffect, useState } from 'react';

/** Live "Xh Ym left" / "Xd left" readout for a window_deadline ISO string. Ticks every 30s — good enough for a countdown, cheap enough to run in every row. */
export function useCountdown(deadlineIso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineIso) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadline)) return null;
  const ms = deadline - now;
  const expired = ms <= 0;
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const days = Math.floor(hours / 24);

  let label: string;
  if (days >= 1) label = `${days}d ${hours % 24}h`;
  else if (hours >= 1) label = `${hours}h ${minutes}m`;
  else label = `${minutes}m`;

  return { expired, urgent: !expired && hours < 48, label: expired ? `closed ${label} ago` : `${label} left` };
}
