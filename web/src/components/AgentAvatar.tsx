/** The agent's face — gives Clawback's reasoning a persona instead of just a feed of text: the hotel's own bellhop, working the OTA invoices instead of the luggage. */
import bellhop from '../assets/bellhop.png';

const SIZES = { sm: 'h-8 w-8', md: 'h-14 w-14', lg: 'h-20 w-20' };

export function AgentAvatar({ size = 'md' }: { size?: keyof typeof SIZES }) {
  return (
    <div className={`flex ${SIZES[size]} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-gold-soft)] ring-2 ring-[var(--color-gold)]/30`}>
      <img src={bellhop} alt="Clawback agent" className="h-full w-full object-cover" />
    </div>
  );
}
