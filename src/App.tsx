import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TerminalView } from './components/TerminalView';
import { PortsMonitor } from './components/PortsMonitor';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { Play, Square, Zap } from 'lucide-react';

function App() {
  const { workspaces, commandsByWs, openSessions, activeSessionId, setActiveSession, loadWorkspaces, openCommand, stopSession, interruptSession } = useWorkspaceStore();
  const [isPortsOpen, setIsPortsOpen] = useState(false);

  useEffect(() => {
    loadWorkspaces().then(() => {
      useWorkspaceStore.getState().restoreAutoSessions();
    });
  }, []);

  const activeSession = openSessions.find(s => s.sessionId === activeSessionId);

  useEffect(() => {
    const cleanup = window.electronAPI.onProcessExit((sessionId) => {
      const st = useWorkspaceStore.getState();
      const updated = st.openSessions.map(s => s.sessionId === sessionId ? { ...s, running: false } : s);
      useWorkspaceStore.setState({ openSessions: updated });
    });
    return () => cleanup();
  }, []);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Header */}
        <div className="h-12 bg-[#1e1e1e] border-b border-black flex items-center px-4 select-none justify-between">
           {activeSession ? (
             <div className="flex items-center gap-2 overflow-hidden">
               <span className="text-sm font-semibold text-zinc-200 truncate">
                 {activeSession.title}
               </span>
               <span className="text-xs text-zinc-500 truncate font-mono bg-zinc-800 px-2 py-0.5 rounded">
                 {activeSession.cwd}
               </span>
             </div>
           ) : (
             <span className="text-sm text-zinc-500">No project selected</span>
           )}

           <div className="flex items-center gap-2">
             <button
               onClick={() => setIsPortsOpen(true)}
               className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
             >
               Ports
             </button>

             {activeSession && (
               <>
                 <button
                   onClick={() => interruptSession(activeSession.sessionId)}
                   disabled={!activeSession.running}
                   className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 transition-colors"
                   title="Ctrl+C"
                 >
                   <Zap size={14} />
                   Ctrl+C
                 </button>
                 <button
                   onClick={() => stopSession(activeSession.sessionId)}
                   disabled={!activeSession.running}
                   className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 transition-colors"
                   title="Kill"
                 >
                   <Square size={14} />
                   Stop
                 </button>
               </>
             )}
           </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative bg-black">
          {/* Tabs */}
          {openSessions.length > 0 && (
            <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 gap-2">
              {openSessions.map((s) => (
                <button
                  key={s.sessionId}
                  onClick={() => setActiveSession(s.sessionId)}
                  className={`px-3 py-1 text-xs rounded ${activeSessionId === s.sessionId ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  title={s.cwd}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle ${s.running ? 'bg-green-500' : 'bg-zinc-600'}"></span>
                  {s.title}
                </button>
              ))}
            </div>
          )}

          {isPortsOpen && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-3xl h-[70vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-zinc-200">Монитор портов</div>
                  <button
                    onClick={() => setIsPortsOpen(false)}
                    className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <PortsMonitor />
                </div>
              </div>
            </div>
          )}

          {openSessions.map(session => {
            const isActive = activeSessionId === session.sessionId;
            return (
              <div key={session.sessionId} className={`absolute inset-0 ${isActive ? 'z-10' : 'z-0 invisible'}`}>
                <div className="relative w-full h-full">
                  <TerminalView projectId={session.sessionId} isActive={isActive} />
                </div>
              </div>
            );
          })}
          
          {!activeSession && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 flex-col gap-2">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
                 <Play size={32} className="text-zinc-700" />
              </div>
              <p>Добавьте папку и команду, затем запустите терминал</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
