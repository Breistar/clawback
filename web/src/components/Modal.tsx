import type { ReactNode } from 'react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="panel max-h-[80vh] w-full max-w-xl overflow-auto p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="tap text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="px-5 py-4 text-sm leading-relaxed text-slate-700">{children}</div>
      </div>
    </div>
  );
}
