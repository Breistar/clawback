import { useState } from 'react';
import { AuditStreamProvider } from './lib/useAuditStream';
import { Overview } from './screens/Overview';
import { Agent } from './screens/Agent';
import { Disputes } from './screens/Disputes';
import { WinBack } from './screens/WinBack';
import { Report } from './screens/Report';
import { Chat } from './screens/Chat';

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
    <div className="min-h-screen">
      <header className="panel-ink sticky top-0 z-40 grid-texture rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-white">Clawback</span>
            <span className="hidden text-xs font-medium text-white/40 sm:inline">enterprise agent · Hotel Casa Alaria</span>
          </div>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {SCREENS.map((s) => (
              <button
                key={s}
                onClick={() => setScreen(s)}
                className={`tap shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  s === screen ? 'bg-[var(--color-ember)] text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {screen === 'Overview' && <Overview onRun={() => setScreen('Agent')} />}
        {screen === 'Agent' && <Agent />}
        {screen === 'Disputes' && <Disputes />}
        {screen === 'Win-Back' && <WinBack />}
        {screen === 'Report' && <Report />}
        {screen === 'Chat' && <Chat />}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-center text-xs text-slate-400 sm:px-6">
        Clawback — claw your money back. Synthetic demo data · Hotel Casa Alaria.
      </footer>
    </div>
  );
}
