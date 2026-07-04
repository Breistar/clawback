import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number toward `target` — makes money figures feel alive when a
 * fresh audit changes them, without re-implementing this in every screen.
 * Respects prefers-reduced-motion and skips the very first paint (no
 * animating in from zero on load, only on real changes).
 */
export function useCountUp(target: number | null | undefined, durationMs = 700): number | null {
  const [value, setValue] = useState<number | null>(target ?? null);
  const prev = useRef<number | null>(target ?? null);
  const first = useRef(true);

  useEffect(() => {
    if (target == null) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (first.current || reduced) {
      first.current = false;
      prev.current = target;
      setValue(target);
      return;
    }
    const from = prev.current ?? target;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
