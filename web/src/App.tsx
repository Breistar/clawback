import { useState } from 'react';
import { AuditStreamProvider } from './lib/useAuditStream';
import { Sidebar, type Screen } from './components/Sidebar';
import { RunAuditButton } from './components/RunAuditButton';
import { Overview } from './screens/Overview';
import { Agent } from './screens/Agent';
import { Disputes } from './screens/Disputes';
import { WinBack } from './screens/WinBack';
import { Report } from './screens/Report';
import { Chat } from './screens/Chat';

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
      <Sidebar screen={screen} setScreen={setScreen} />
      <main className="ml-60 min-h-screen px-6 pb-28 pt-6 sm:px-10 sm:pt-8">
        <div className="mx-auto max-w-6xl">
          {screen === 'Overview' && <Overview />}
          {screen === 'Agent' && <Agent />}
          {screen === 'Disputes' && <Disputes />}
          {screen === 'Win-Back' && <WinBack />}
          {screen === 'Report' && <Report />}
          {screen === 'Chat' && <Chat />}
        </div>
      </main>
      <RunAuditButton onRun={() => setScreen('Agent')} />
    </div>
  );
}
