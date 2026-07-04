/**
 * One shared SSE connection to /api/audit/stream for every screen.
 * Event types: plan | retrieve | finding | tool | decision | learned | phase | done | error
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AgentEvent = {
  type: 'plan' | 'retrieve' | 'finding' | 'tool' | 'decision' | 'learned' | 'phase' | 'done' | 'error';
  text: string;
  citations?: string[];
  amount?: number;
};

type Ctx = { events: AgentEvent[]; running: boolean; ruleBanner: string | null; runAudit: () => Promise<void> };
const AuditCtx = createContext<Ctx>({ events: [], running: false, ruleBanner: null, runAudit: async () => {} });

export function AuditStreamProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [ruleBanner, setRuleBanner] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/audit/stream');
    source.onmessage = (msg) => {
      const event: AgentEvent = JSON.parse(msg.data);
      if (event.type === 'learned') {
        setRuleBanner(event.text);
        setTimeout(() => setRuleBanner(null), 6000);
      }
      if (event.type === 'done' || event.type === 'error') setRunning(false);
      setEvents((prev) => [...prev, event]);
    };
    return () => source.close();
  }, []);

  const runAudit = async () => {
    setEvents([]);
    setRunning(true);
    try {
      const res = await fetch('/api/audit/run', { method: 'POST' });
      if (!res.ok) {
        // A silent no-op here reads as "the button does nothing" — surface
        // why, in the same feed that shows every other agent event.
        const body = await res.json().catch(() => ({}) as { error?: string; runningForMs?: number });
        const text = res.status === 409
          ? `An audit is already running on the server${body.runningForMs ? ` (started ${Math.round(body.runningForMs / 1000)}s ago)` : ''} — wait for it to finish. If it has been stuck for several minutes, the next click will take over automatically.`
          : `Could not start the audit (HTTP ${res.status}).`;
        setEvents([{ type: 'error', text }]);
        setRunning(false);
      }
    } catch {
      setEvents([{ type: 'error', text: 'Could not reach the server — check that the API is running.' }]);
      setRunning(false);
    }
  };

  return <AuditCtx.Provider value={{ events, running, ruleBanner, runAudit }}>{children}</AuditCtx.Provider>;
}

export const useAuditStream = () => useContext(AuditCtx);

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export const mxn = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
