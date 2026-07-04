/**
 * Functional skeleton — six screens wired to the API, deliberately unstyled.
 * Visual design is the frontend owner's domain (see HACKATHON.md §6).
 * Never use the word "dashboard": the first screen is Overview.
 */
import { useEffect, useState } from 'react';
import { AuditStreamProvider, useAuditStream, getJson, mxn, type AgentEvent } from './lib/useAuditStream';

const SCREENS = ['Overview', 'Agent', 'Disputes', 'Win-Back', 'Report', 'Chat'] as const;
type Screen = (typeof SCREENS)[number];

export default function App() {
  return (
    <AuditStreamProvider>
      <Shell />
    </AuditStreamProvider>
  );
}

function Shell() {
  const [screen, setScreen] = useState<Screen>('Overview');
  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex items-center gap-4">
        <h1 className="text-xl font-bold">Clawback</h1>
        <nav className="flex gap-2">
          {SCREENS.map((s) => (
            <button key={s} onClick={() => setScreen(s)} className={s === screen ? 'font-bold underline' : ''}>
              {s}
            </button>
          ))}
        </nav>
      </header>
      {screen === 'Overview' && <Overview onRun={() => setScreen('Agent')} />}
      {screen === 'Agent' && <Agent />}
      {screen === 'Disputes' && <Disputes />}
      {screen === 'Win-Back' && <WinBack />}
      {screen === 'Report' && <Report />}
      {screen === 'Chat' && <Chat />}
    </div>
  );
}

type ReportData = {
  prevented_today: number; disputable_month: number; verify_pending: number;
  recoverable_monthly: number; repeat_guests: number;
  ota_share_today: number; ota_share_projected: number; annual_savings: number;
};

function Overview({ onRun }: { onRun: () => void }) {
  const { runAudit, running } = useAuditStream();
  const [r, setR] = useState<ReportData | null>(null);
  useEffect(() => { getJson<ReportData>('/api/report').then(setR).catch(console.error); }, [running]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card label="At risk TODAY" value={r ? mxn(r.prevented_today) : '—'} sub="Sentinel caught it — 36h left" />
        <Card label="Disputable this month" value={r ? mxn(r.disputable_month) : '—'} sub="found by the Auditor" />
        <Card label="Recoverable every month" value={r ? mxn(r.recoverable_monthly) : '—'} sub={`Win-Back: ${r?.repeat_guests ?? 0} repeat guests`} />
      </div>
      <p>North Star: OTA share {r?.ota_share_today ?? '—'}% today → {r?.ota_share_projected ?? '—'}% projected · annual savings {r ? mxn(r.annual_savings) : '—'} MXN</p>
      <button onClick={() => { runAudit(); onRun(); }} disabled={running} className="border px-4 py-2">
        {running ? 'Audit running…' : '▶ Run Full Audit'}
      </button>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border p-3">
      <div className="text-xs uppercase">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{sub}</div>
    </div>
  );
}

function Agent() {
  const { events, running, runAudit } = useAuditStream();
  const [doc, setDoc] = useState<{ id: string; body: string } | null>(null);
  const open = async (id: string) => {
    const d = await getJson<any>(`/api/documents/${encodeURIComponent(id)}`);
    setDoc({ id, body: d.markdown ?? JSON.stringify(d.data, null, 2) });
  };
  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-2">
        <button onClick={runAudit} disabled={running} className="border px-3 py-1">
          {running ? 'Running…' : '▶ Run Full Audit'}
        </button>
        {events.map((e, i) => <EventRow key={i} e={e} onCitation={open} />)}
      </div>
      {doc && (
        <aside className="w-80 border p-2">
          <button onClick={() => setDoc(null)}>✕ {doc.id}</button>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{doc.body}</pre>
        </aside>
      )}
    </div>
  );
}

function EventRow({ e, onCitation }: { e: AgentEvent; onCitation: (id: string) => void }) {
  if (e.type === 'phase') return <div className="pt-3 font-bold">— PHASE · {e.text} —</div>;
  return (
    <div className="border-l-4 p-2 text-sm" data-type={e.type}>
      <span className="mr-2 text-xs uppercase opacity-60">{e.type}</span>
      {e.text}
      {e.citations?.map((c) => (
        <button key={c} onClick={() => onCitation(c)} className="ml-1 border px-1 text-xs">{c}</button>
      ))}
    </div>
  );
}

type Dispute = {
  id: number; reservation_id: number; ota: string; finding: string;
  decision: string; confidence: string; confidence_reason: string;
  amount: number; evidence: string[]; memo_md: string | null; window_deadline: string | null;
};

function Disputes() {
  const { running } = useAuditStream();
  const [rows, setRows] = useState<Dispute[]>([]);
  useEffect(() => { getJson<Dispute[]>('/api/disputes').then(setRows).catch(console.error); }, [running]);
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left"><th>Res</th><th>Finding</th><th>Amount</th><th>Decision</th><th>Confidence</th><th>Evidence</th></tr></thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.id} className="border-t align-top">
            <td>#{d.reservation_id}</td>
            <td>{d.finding}</td>
            <td>{d.amount ? mxn(d.amount) : '—'}</td>
            <td>{d.decision}</td>
            <td title={d.confidence_reason}>{d.confidence}</td>
            <td>{d.evidence.join(' ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Offer = {
  id: number; guest_name: string; segment: string; r_days: number; f_stays: number;
  m_avg: number; channel: string; burned_per_visit: number; burned_per_year: number; offer_md: string;
};

function WinBack() {
  const { running } = useAuditStream();
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => { getJson<Offer[]>('/api/winback').then(setOffers).catch(console.error); }, [running]);
  return (
    <div className="grid grid-cols-2 gap-3">
      {offers.map((o) => (
        <div key={o.id} className="border p-3 text-sm">
          <b>{o.guest_name}</b> · {o.segment} · R {o.r_days}d · F {o.f_stays}× · M {mxn(o.m_avg)} · {o.channel}
          <div>Commission burned: {mxn(o.burned_per_visit)}/visit · ~{mxn(o.burned_per_year)}/year</div>
          <p className="mt-2">{o.offer_md}</p>
          <button className="mt-2 border px-2">✓ Approve message</button>
        </div>
      ))}
      <p className="text-xs opacity-60">Source: hotel's own PMS guest records.</p>
    </div>
  );
}

function Report() {
  const { running } = useAuditStream();
  const [r, setR] = useState<ReportData | null>(null);
  useEffect(() => { getJson<ReportData>('/api/report').then(setR).catch(console.error); }, [running]);
  if (!r) return null;
  return (
    <div className="space-y-2">
      <h2 className="font-bold">Margin Report — Hotel Casa Alaria</h2>
      <p>Prevented today: {mxn(r.prevented_today)} · Disputable this month: {mxn(r.disputable_month)} · Verify: {mxn(r.verify_pending)} · Recoverable monthly: {mxn(r.recoverable_monthly)}</p>
      <p>North Star: {r.ota_share_today}% → {r.ota_share_projected}% · annual savings {mxn(r.annual_savings)} MXN</p>
    </div>
  );
}

function Chat() {
  const { ruleBanner } = useAuditStream();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const banner = ruleBanner ?? localBanner;

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => {
        if (h?.app !== 'clawback' || h?.chat !== 'sqlite-evidence-v2') {
          setBackendError(
            `Wrong API backend (got ${h?.app ?? 'unknown'}). Stop clawback-prototype, set API_PORT=3002 in .env, restart npm run dev.`,
          );
        }
      })
      .catch(() => setBackendError('Cannot reach /api/health — is the clawback API running?'));
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120_000);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        const fallback = data.reply ?? data.error ?? `HTTP ${res.status}`;
        throw new Error(fallback);
      }
      let reply = (data.reply ?? '').trim();
      if (/ANTHROPIC_API_KEY|scripted fallback/i.test(reply)) {
        setBackendError('Connected to clawback-prototype (old API on :3001). Stop it, use API_PORT=3002, restart npm run dev.');
        reply = 'Wrong backend — see the red banner above. Your question did not reach the clawback server.';
      }
      if (!reply) {
        reply = 'The agent returned an empty response. Try naming a reservation (e.g. "Explain dispute #1284") after running the audit.';
      }
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (data.ruleLearned) {
        setLocalBanner(data.ruleLearned);
        setTimeout(() => setLocalBanner(null), 8000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out after 2 minutes — the inference API may be slow. Retry or check VULTR_INFERENCE_API_KEY on the server.'
        : err instanceof Error ? err.message : String(err);
      setMessages([...next, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {backendError && <div className="border border-red-500 bg-red-50 p-2 text-sm text-red-800">{backendError}</div>}
      {ruleBanner && <div className="border p-2 font-bold">✓ RULE LEARNED: {ruleBanner}</div>}
      {messages.map((m, i) => <p key={i}><b>{m.role}:</b> {m.content}</p>)}
      {busy && <p className="text-gray-500 italic">agent thinking…</p>}
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} className="flex-1 border px-2 py-1" placeholder="Ask the agent…" />
        <button onClick={send} disabled={busy} className="border px-3">Send</button>
      </div>
    </div>
  );
}
