/** Small vocabulary of pills shared by every screen — decisions, confidence, RFM segments, agent-event types all read the same visual language. */

export function DecisionPill({ decision }: { decision: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    AT_RISK: { cls: 'pill-ember', label: '⏱ At risk' },
    DISPUTABLE: { cls: 'pill-money', label: '✓ Disputable' },
    NOT_DISPUTABLE: { cls: 'pill-neutral', label: 'Not disputable' },
    VERIFY: { cls: 'pill-verify', label: '◐ Verify' },
  };
  const m = map[decision] ?? { cls: 'pill-neutral', label: decision };
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
}

export function ConfidencePill({ confidence }: { confidence: string }) {
  const map: Record<string, string> = { HIGH: 'pill-money', MEDIUM: 'pill-verify', LOW: 'pill-ember' };
  return <span className={`pill ${map[confidence] ?? 'pill-neutral'}`}>{confidence}</span>;
}

const SEGMENTS: Record<string, { cls: string; label: string }> = {
  CHAMPION: { cls: 'pill-verify', label: '★ Champion' },
  LOYAL: { cls: 'pill-plan', label: 'Loyal' },
  PROMISING: { cls: 'pill-retrieve', label: 'Promising' },
  DORMANT: { cls: 'pill-neutral', label: 'Dormant' },
};
export function SegmentPill({ segment }: { segment: string }) {
  const m = SEGMENTS[segment] ?? { cls: 'pill-neutral', label: segment };
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
}

export const EVENT_STYLE: Record<string, { cls: string; label: string }> = {
  plan: { cls: 'pill-plan', label: 'Plan' },
  retrieve: { cls: 'pill-retrieve', label: 'Retrieve' },
  finding: { cls: 'pill-verify', label: 'Finding' },
  tool: { cls: 'pill-tool', label: 'Tool' },
  decision: { cls: 'pill-money', label: 'Decision' },
  learned: { cls: 'pill-money', label: 'Rule learned' },
  error: { cls: 'pill-ember', label: 'Error' },
  done: { cls: 'pill-neutral', label: 'Done' },
};
export function EventTypePill({ type }: { type: string }) {
  const m = EVENT_STYLE[type] ?? { cls: 'pill-neutral', label: type };
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
}
