const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const HUES = ['bg-[var(--color-plan-soft)] text-[var(--color-plan)]', 'bg-[var(--color-money-soft)] text-[var(--color-money)]', 'bg-[var(--color-verify-soft)] text-[var(--color-verify)]', 'bg-[var(--color-tool-soft)] text-[var(--color-tool)]', 'bg-[var(--color-retrieve-soft)] text-[var(--color-retrieve)]'];

function hueFor(name: string) {
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0)) % HUES.length;
  return HUES[h];
}

export function Avatar({ name }: { name: string }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${hueFor(name)}`}>
      {initials(name)}
    </div>
  );
}
