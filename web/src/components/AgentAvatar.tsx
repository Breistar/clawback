/** The agent's face — gives Clawback's reasoning a persona instead of just a feed of text. */
const SIZES = { sm: 'h-8 w-8 text-base', md: 'h-14 w-14 text-2xl', lg: 'h-20 w-20 text-4xl' };

export function AgentAvatar({ size = 'md' }: { size?: keyof typeof SIZES }) {
  return (
    <div className={`flex ${SIZES[size]} shrink-0 items-center justify-center rounded-full bg-[var(--color-gold-soft)] ring-2 ring-[var(--color-gold)]/30`}>
      <span aria-hidden>🦉</span>
    </div>
  );
}
