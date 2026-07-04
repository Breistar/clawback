/** Side panel opened by clicking any citation chip (BKG-§4.2, PMS-1284, …). Resolves either a markdown contract/policy section or a raw DB record via GET /api/documents/:id. */
import { useEffect, useState } from 'react';
import { getJson } from '../lib/useAuditStream';

type DocResult = { kind: 'document' | 'record'; id: string; markdown?: string; data?: unknown };

export function DocumentPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [doc, setDoc] = useState<DocResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDoc(null);
    setError(null);
    getJson<DocResult>(`/api/documents/${encodeURIComponent(id)}`).then(setDoc).catch((e) => setError(String(e)));
  }, [id]);

  return (
    <aside className="panel flex w-full flex-col overflow-hidden lg:w-96">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
        <span className="chip cursor-default">{id}</span>
        <button onClick={onClose} className="tap text-sm text-slate-400 hover:text-slate-700">✕</button>
      </div>
      <div className="max-h-[32rem] overflow-auto px-4 py-3 text-sm leading-relaxed">
        {error && <p className="text-rose-600">Could not load {id}.</p>}
        {!doc && !error && <p className="text-slate-400">Loading…</p>}
        {doc?.kind === 'document' && <pre className="whitespace-pre-wrap font-sans text-[13px] text-slate-700">{doc.markdown}</pre>}
        {doc?.kind === 'record' && (
          <table className="w-full text-[13px]">
            <tbody>
              {Object.entries((doc.data as Record<string, unknown>) ?? {}).map(([k, v]) => (
                <tr key={k} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="py-1 pr-3 font-mono text-slate-400">{k}</td>
                  <td className="py-1 font-medium text-slate-800">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  );
}
