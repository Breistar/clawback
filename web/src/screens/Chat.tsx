/**
 * Chat — manager interrogates or corrects the agent. Corrections become
 * learned rules (green banner, persisted, applied to future audits).
 *
 * Logic here is copied verbatim from main's App.tsx Chat() — health check,
 * abort-after-120s, wrong-backend detection, empty-reply fallback, busy
 * indicator — only the presentation changed.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuditStream } from '../lib/useAuditStream';
import { PageHeader } from '../components/PageHeader';
import { AgentAvatar } from '../components/AgentAvatar';

type Message = { role: 'user' | 'assistant'; content: string };

export function Chat() {
  const { ruleBanner } = useAuditStream();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const banner = ruleBanner ?? localBanner;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, busy]);

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
    <div className="space-y-4">
      <PageHeader title="Chat" />

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col">
          {backendError && (
            <div className="mb-3 rounded-lg border border-[var(--color-ember)]/40 bg-[var(--color-ember-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ember)]">
              {backendError}
            </div>
          )}
          {ruleBanner && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--color-money-soft)] px-4 py-2.5 text-sm font-bold text-[var(--color-money)]">
              ✓ RULE LEARNED: {ruleBanner}
            </div>
          )}

          <div className="panel flex min-h-[26rem] flex-1 flex-col gap-3 overflow-auto p-4">
            {messages.length === 0 && (
              <div className="m-auto max-w-sm space-y-3 text-center">
                <AgentAvatar size="lg" />
                <p className="text-sm text-slate-400">Ask the agent why it decided something, or correct it — corrections become rules.</p>
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {busy && <Bubble m={{ role: 'assistant', content: 'agent thinking…' }} />}
            <div ref={endRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask the agent…"
              className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm focus:border-[var(--color-gold)] focus:outline-none"
            />
            <button onClick={() => send()} disabled={busy} className="tap rounded-xl bg-[var(--color-ink)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: Message }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-[var(--color-ink)] text-white' : 'bg-slate-100 text-slate-800'}`}>
        {m.content}
      </div>
    </div>
  );
}
