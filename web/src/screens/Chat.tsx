/**
 * Chat — manager interrogates or corrects the agent. Corrections become
 * learned rules (green banner, persisted, applied to future audits).
 */
import { useEffect, useRef, useState } from 'react';
import { useAuditStream } from '../lib/useAuditStream';
import { DocumentPanel } from '../components/DocumentPanel';

type Message = { role: 'user' | 'assistant'; content: string; citations?: string[] };
const HINTS = ['Why did you flag reservation #1284?', "We have a special agreement with Corporativo Mixteca — don't dispute their invoices.", 'Why is #1310 not disputable?'];

export function Chat() {
  const { ruleBanner } = useAuditStream();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, busy]);

  const send = async (text0?: string) => {
    const text = (text0 ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.reply ?? data.error ?? 'No response.', citations: data.citations }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Connection error — try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 flex-col">
        {ruleBanner && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--color-money-soft)] px-4 py-2.5 text-sm font-bold text-[var(--color-money)]">
            ✓ RULE LEARNED: {ruleBanner}
          </div>
        )}

        <div className="panel flex min-h-[26rem] flex-1 flex-col gap-3 overflow-auto p-4">
          {messages.length === 0 && (
            <div className="m-auto max-w-sm space-y-3 text-center">
              <p className="text-sm text-slate-400">Ask the agent why it decided something, or correct it — corrections become rules.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {HINTS.map((h) => (
                  <button key={h} onClick={() => send(h)} className="tap rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-[var(--color-plan)] hover:text-[var(--color-plan)]">
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => <Bubble key={i} m={m} onCitation={setOpenDoc} />)}
          {busy && <Bubble m={{ role: 'assistant', content: '…' }} onCitation={setOpenDoc} />}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask the agent…"
            className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm focus:border-[var(--color-plan)] focus:outline-none"
          />
          <button onClick={() => send()} disabled={busy} className="tap rounded-xl bg-[var(--color-ember)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            Send
          </button>
        </div>
      </div>

      {openDoc && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          <DocumentPanel id={openDoc} onClose={() => setOpenDoc(null)} />
        </div>
      )}
    </div>
  );
}

function Bubble({ m, onCitation }: { m: Message; onCitation: (id: string) => void }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-[var(--color-ink)] text-white' : 'bg-slate-100 text-slate-800'}`}>
        {m.content}
        {!!m.citations?.length && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.citations.map((c) => <button key={c} onClick={() => onCitation(c)} className="chip">{c}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}
