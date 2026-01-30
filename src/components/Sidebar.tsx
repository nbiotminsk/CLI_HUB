import React, { useState } from 'react';
import { Plus, Play, Square, Terminal as TerminalIcon } from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { WorkspaceCommand } from '../types';

export const Sidebar: React.FC = () => {
  const { workspaces, commandsByWs, openSessions, activeSessionId, setActiveSession, addWorkspaceFromPicker, openCommand, stopSession } = useWorkspaceStore();
  const [expandedWsId, setExpandedWsId] = useState<string | null>(null);
  const [addingCommandWsId, setAddingCommandWsId] = useState<string | null>(null);
  const [newCommandName, setNewCommandName] = useState('');
  const [newCommandCmd, setNewCommandCmd] = useState('');

  const handleStart = async (e: React.MouseEvent, workspaceId: string, command: WorkspaceCommand) => {
    e.stopPropagation();
    await openCommand(workspaceId, command.id);
  };

  const handleAddWorkspace = async () => {
    await addWorkspaceFromPicker();
  };

  const handleAddCommand = async (workspaceId: string) => {
    if (!newCommandName || !newCommandCmd) return;
    const now = new Date().toISOString();
    const command: WorkspaceCommand = {
      id: crypto.randomUUID(),
      name: newCommandName,
      command: newCommandCmd,
      createdAt: now,
      updatedAt: now,
      lastRunning: false,
    };
    await useWorkspaceStore.getState().addCommand(workspaceId, command);
    setAddingCommandWsId(null);
    setNewCommandName('');
    setNewCommandCmd('');
  };

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-white font-bold text-lg flex items-center gap-2 select-none">
          <TerminalIcon className="text-blue-500" />
          CLI Hub
        </h1>
        <button 
          onClick={handleAddWorkspace}
          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
          title="Add Folder"
        >
          <Plus size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workspaces.length === 0 && (
          <div className="text-center text-zinc-500 text-sm py-4">
            Нет папок.<br/>Нажмите + чтобы добавить.
          </div>
        )}
        {workspaces.map((ws) => {
          const commands = commandsByWs[ws.id] || [];
          const isExpanded = expandedWsId === ws.id;
          return (
            <div key={ws.id} className="rounded">
              <div
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                onClick={() => setExpandedWsId(isExpanded ? null : ws.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-zinc-600" />
                  <span className="text-sm text-zinc-300 truncate font-medium select-none">{ws.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingCommandWsId(ws.id); }}
                  className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                  title="Add Command"
                >
                  <Plus size={14} />
                </button>
              </div>
              {isExpanded && (
                <div className="pl-3 py-1 space-y-1">
                  {commands.length === 0 && (
                    <div className="text-xs text-zinc-500">Нет команд</div>
                  )}
                  {commands.map((cmd) => {
                    const runningSession = openSessions.find((s) => s.workspaceId === ws.id && s.commandId === cmd.id && s.running);
                    const isRunning = !!runningSession;
                    return (
                      <div key={cmd.id} className="group flex items-center justify-between p-2 rounded hover:bg-zinc-800/40">
                        <div
                          className="flex items-center gap-2 overflow-hidden cursor-pointer"
                          onClick={() => {
                            if (runningSession) {
                              setActiveSession(runningSession.sessionId);
                            } else {
                              openCommand(ws.id, cmd.id);
                            }
                          }}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'}`} />
                          <span className="text-sm text-zinc-300 truncate font-medium select-none">{cmd.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isRunning ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); stopSession(runningSession!.sessionId); }}
                              className="p-1 rounded text-red-400 hover:bg-red-400/10"
                              title="Stop"
                            >
                              <Square size={14} fill="currentColor" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleStart(e, ws.id, cmd)}
                              className="p-1 rounded text-green-400 hover:bg-green-400/10"
                              title="Start"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {addingCommandWsId === ws.id && (
                    <div className="space-y-2 p-2 border border-zinc-800 rounded">
                      <input
                        value={newCommandName}
                        onChange={(e) => setNewCommandName(e.target.value)}
                        placeholder="Имя команды (например, npm start)"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                      />
                      <input
                        value={newCommandCmd}
                        onChange={(e) => setNewCommandCmd(e.target.value)}
                        placeholder="Команда (например, npm start)"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddCommand(ws.id)}
                          className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => { setAddingCommandWsId(null); setNewCommandName(''); setNewCommandCmd(''); }}
                          className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 text-center select-none">
          v1.0.0
        </div>
      </div>

      
    </div>
  );
};
