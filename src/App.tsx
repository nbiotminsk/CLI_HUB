import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TerminalView } from './components/TerminalView';
import { PortsMonitor } from './components/PortsMonitor';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { Play, Square, Zap, Plus, X } from 'lucide-react';
import { electronAPI } from './lib/electron';

function App() {
  const { workspaces, commandsByWs, openSessions, activeSessionId, setActiveSession, loadWorkspaces, openCommand, stopSession, interruptSession, createTerminalSession, closeSession } = useWorkspaceStore();
  const [isPortsOpen, setIsPortsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // New Terminal: Meta+T or Ctrl+T
      if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        createTerminalSession();
      }
      
      // Close Terminal: Meta+W or Ctrl+W
      if ((e.metaKey || e.ctrlKey) && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        const active = useWorkspaceStore.getState().activeSessionId;
        if (active) {
          closeSession(active);
        }
      }

      // Next Terminal: Ctrl+Tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
         e.preventDefault();
         useWorkspaceStore.getState().nextSession();
      }

      // Prev Terminal: Ctrl+Shift+Tab
      if (e.ctrlKey && e.key === 'Tab' && e.shiftKey) {
         e.preventDefault();
         useWorkspaceStore.getState().prevSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const onFocus = () => useWorkspaceStore.getState().setWindowFocused(true);
    const onBlur = () => useWorkspaceStore.getState().setWindowFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  useEffect(() => {
    loadWorkspaces().then(() => {
      useWorkspaceStore.getState().restoreAutoSessions();
    });
  }, []);

  const activeSession = openSessions.find(s => s.sessionId === activeSessionId);

  useEffect(() => {
    const cleanup = (electronAPI?.onProcessExit?.((sessionId) => {
      const st = useWorkspaceStore.getState();
      const updated = st.openSessions.map(s => s.sessionId === sessionId ? { ...s, running: false } : s);
      useWorkspaceStore.setState({ openSessions: updated });
    }) ?? (() => {}));
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
          <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 gap-2 overflow-x-auto">
            {openSessions.map((s) => (
              <div
                key={s.sessionId}
                className={`group flex items-center px-3 py-1 text-xs rounded cursor-pointer border border-transparent select-none ${activeSessionId === s.sessionId ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                onClick={() => setActiveSession(s.sessionId)}
                title={s.cwd}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.running ? 'bg-green-500' : 'bg-zinc-600'}`}></span>
                <span className="mr-2 max-w-[150px] truncate">{s.title}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSession(s.sessionId);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5 rounded hover:bg-zinc-700"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => createTerminalSession()}
              className="px-2 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="New Terminal (Ctrl+T)"
            >
              <Plus size={14} />
            </button>
          </div>

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
              <p>Нет активных терминалов</p>
              <button 
                onClick={() => createTerminalSession()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors text-sm"
              >
                Создать терминал
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
