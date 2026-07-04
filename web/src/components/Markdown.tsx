/**
 * Tiny markdown renderer for the citation side panel — just enough for the
 * contracts/policies in /data/documents (#/## headers, **bold**, `code`,
 * paragraphs). No new dependency for a handful of well-known documents.
 */
import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="chip cursor-default">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const line = block.trim();
        if (line.startsWith('## ')) {
          return <h3 key={i} className="pt-1 text-sm font-extrabold uppercase tracking-wide text-[var(--color-plan)]">{renderInline(line.slice(3))}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="text-base font-extrabold text-slate-900">{renderInline(line.slice(2))}</h2>;
        }
        return <p key={i} className="leading-relaxed text-slate-700">{renderInline(line)}</p>;
      })}
    </div>
  );
}
