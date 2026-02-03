import React, { useState } from "react";
import {
  Plus,
  Play,
  Square,
  Terminal as TerminalIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type { WorkspaceCommand } from "../types";
import { QUICK_ACTIONS } from "../constants";

export const Sidebar: React.FC = () => {
  const {
    workspaces,
    commandsByWs,
    scriptsByWs,
    openSessions,
    setActiveSession,
    addWorkspaceFromPicker,
    openCommand,
    openQuickCommand,
    deleteWorkspace,
    updateCommand,
    deleteCommand,
    closeSession,
    stopSession,
    loadPackageScripts,
  } = useWorkspaceStore();
  const [expandedWsId, setExpandedWsId] = useState<string | null>(null);
  const [addingCommandWsId, setAddingCommandWsId] = useState<string | null>(
    null,
  );
  const [newCommandName, setNewCommandName] = useState("");
  const [newCommandCmd, setNewCommandCmd] = useState("");
  const [addingToolWsId, setAddingToolWsId] = useState<string | null>(null);
  const [newToolName, setNewToolName] = useState("");
  const [newToolCmd, setNewToolCmd] = useState("");
  const [newToolInWorkspace, setNewToolInWorkspace] = useState(true);
  const [editingToolWsId, setEditingToolWsId] = useState<string | null>(null);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolName, setEditToolName] = useState("");
  const [editToolCmd, setEditToolCmd] = useState("");
  const [editToolInWorkspace, setEditToolInWorkspace] = useState(true);
  const [previewCmd, setPreviewCmd] = useState<{
    wsId: string;
    cmd: WorkspaceCommand;
  } | null>(null);

  const toNpmScriptCommand = (name: string) =>
    name === "start" ? "npm start" : `npm run ${name}`;

  const handleRunScript = (workspaceId: string, name: string) => {
    const command = toNpmScriptCommand(name);
    openQuickCommand(workspaceId, command, command);
  };

  const handleQuickAction = (
    workspaceId: string,
    action: (typeof QUICK_ACTIONS)[number],
  ) => {
    const existing = openSessions.find(
      (s) => s.workspaceId === workspaceId && s.title === action.label,
    );
    if (existing) {
      setActiveSession(existing.sessionId);
      return;
    }
    openQuickCommand(workspaceId, action.label, action.command, {
      runInWorkspace: action.runInWorkspace,
    });
  };

  const handleRunTool = (workspaceId: string, tool: WorkspaceCommand) => {
    const existing = openSessions.find(
      (s) => s.workspaceId === workspaceId && s.commandId === tool.id,
    );
    if (existing) {
      setActiveSession(existing.sessionId);
      return;
    }
    openCommand(workspaceId, tool.id);
  };

  const handleAddWorkspace = async () => {
    await addWorkspaceFromPicker();
  };

  const handleDeleteWorkspace = async (workspaceId: string, name: string) => {
    const ok = window.confirm(
      `Удалить проект "${name}"? Все его команды и активные сессии будут закрыты.`,
    );
    if (!ok) return;
    await deleteWorkspace(workspaceId);
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
    setNewCommandName("");
    setNewCommandCmd("");
  };

  const handleDeleteCommand = async (
    workspaceId: string,
    cmd: WorkspaceCommand,
  ) => {
    const ok = window.confirm(`Удалить команду "${cmd.name}"?`);
    if (!ok) return;
    const sessions = openSessions.filter(
      (s) => s.workspaceId === workspaceId && s.commandId === cmd.id,
    );
    await Promise.all(sessions.map((s) => closeSession(s.sessionId)));
    await deleteCommand(workspaceId, cmd.id);
  };

  const handleAddTool = async (workspaceId: string) => {
    if (!newToolName || !newToolCmd) return;
    const now = new Date().toISOString();
    const tool: WorkspaceCommand = {
      id: crypto.randomUUID(),
      name: newToolName,
      command: newToolCmd,
      createdAt: now,
      updatedAt: now,
      category: "tool",
      runInWorkspace: newToolInWorkspace,
    };
    await useWorkspaceStore.getState().addCommand(workspaceId, tool);
    setAddingToolWsId(null);
    setNewToolName("");
    setNewToolCmd("");
    setNewToolInWorkspace(true);
  };

  const beginEditTool = (workspaceId: string, tool: WorkspaceCommand) => {
    setEditingToolWsId(workspaceId);
    setEditingToolId(tool.id);
    setEditToolName(tool.name);
    setEditToolCmd(tool.command);
    setEditToolInWorkspace(tool.runInWorkspace !== false);
    setAddingToolWsId(null);
  };

  const handleSaveTool = async (workspaceId: string) => {
    if (!editingToolId || !editToolName || !editToolCmd) return;
    await updateCommand(workspaceId, editingToolId, {
      name: editToolName,
      command: editToolCmd,
      runInWorkspace: editToolInWorkspace,
      category: "tool",
    });
    setEditingToolWsId(null);
    setEditingToolId(null);
    setEditToolName("");
    setEditToolCmd("");
    setEditToolInWorkspace(true);
  };

  const handleDeleteTool = async (workspaceId: string, toolId: string) => {
    await deleteCommand(workspaceId, toolId);
    if (editingToolId === toolId) {
      setEditingToolWsId(null);
      setEditingToolId(null);
      setEditToolName("");
      setEditToolCmd("");
      setEditToolInWorkspace(true);
    }
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
            Нет папок.
            <br />
            Нажмите + чтобы добавить.
          </div>
        )}
        {workspaces.map((ws) => {
          const commands = commandsByWs[ws.id] || [];
          const toolCommands = commands.filter((c) => c.category === "tool");
          const visibleCommands = commands.filter((c) => c.category !== "tool");
          const scripts = scriptsByWs[ws.id] || {};
          const scriptEntries = Object.entries(scripts);
          const isExpanded = expandedWsId === ws.id;
          return (
            <div key={ws.id} className="rounded">
              <div
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${isExpanded ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
                onClick={() => {
                  if (!isExpanded) {
                    loadPackageScripts(ws.id);
                  }
                  setExpandedWsId(isExpanded ? null : ws.id);
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-zinc-600" />
                  <span className="text-sm text-zinc-300 truncate font-medium select-none">
                    {ws.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingCommandWsId(ws.id);
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                    title="Add Command"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkspace(ws.id, ws.name);
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    title="Delete Project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="pl-3 py-1 space-y-1">
                  {visibleCommands.length === 0 && (
                    <div className="text-xs text-zinc-500">Нет команд</div>
                  )}
                  {visibleCommands.map((cmd) => {
                    const runningSession = openSessions.find(
                      (s) =>
                        s.workspaceId === ws.id &&
                        s.commandId === cmd.id &&
                        s.running,
                    );
                    const isRunning = !!runningSession;
                    return (
                      <div
                        key={cmd.id}
                        className="group flex items-center justify-between p-2 rounded hover:bg-zinc-800/40"
                      >
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
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-zinc-600"}`}
                          />
                          <span className="text-sm text-zinc-300 truncate font-medium select-none">
                            {cmd.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isRunning ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                stopSession(runningSession!.sessionId);
                              }}
                              className="p-1 rounded text-red-400 hover:bg-red-400/10"
                              title="Stop"
                            >
                              <Square size={14} fill="currentColor" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewCmd({ wsId: ws.id, cmd });
                              }}
                              className="p-1 rounded text-green-400 hover:bg-green-400/10"
                              title="Start"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCommand(ws.id, cmd);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                            title="Delete Command"
                          >
                            <Trash2 size={12} />
                          </button>
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
                          onClick={() => {
                            setAddingCommandWsId(null);
                            setNewCommandName("");
                            setNewCommandCmd("");
                          }}
                          className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Scripts
                    </div>
                    {scriptEntries.length === 0 && (
                      <div className="text-xs text-zinc-600">
                        Нет скриптов в package.json
                      </div>
                    )}
                    {scriptEntries.map(([name, cmd]) => {
                      const label = toNpmScriptCommand(name);
                      return (
                        <button
                          key={name}
                          onClick={() => handleRunScript(ws.id, name)}
                          className="w-full text-left px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                          title={cmd}
                        >
                          <div className="font-medium">{label}</div>
                          <div className="font-mono text-zinc-400 truncate">
                            {cmd}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Tools
                      </div>
                      <button
                        onClick={() => setAddingToolWsId(ws.id)}
                        className="text-[11px] text-zinc-400 hover:text-white"
                        title="Add tool"
                      >
                        + Tool
                      </button>
                    </div>
                    {editingToolWsId === ws.id && (
                      <div className="space-y-2 p-2 border border-zinc-800 rounded">
                        <div className="text-xs text-zinc-400">
                          Редактировать инструмент
                        </div>
                        <input
                          value={editToolName}
                          onChange={(e) => setEditToolName(e.target.value)}
                          placeholder="Имя инструмента"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                        />
                        <input
                          value={editToolCmd}
                          onChange={(e) => setEditToolCmd(e.target.value)}
                          placeholder="Команда"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                        />
                        <label className="flex items-center gap-2 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={editToolInWorkspace}
                            onChange={(e) =>
                              setEditToolInWorkspace(e.target.checked)
                            }
                            className="rounded bg-zinc-800 border-zinc-700"
                          />
                          Запускать в проекте
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveTool(ws.id)}
                            className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => {
                              setEditingToolWsId(null);
                              setEditingToolId(null);
                              setEditToolName("");
                              setEditToolCmd("");
                              setEditToolInWorkspace(true);
                            }}
                            className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                    {addingToolWsId === ws.id && (
                      <div className="space-y-2 p-2 border border-zinc-800 rounded">
                        <input
                          value={newToolName}
                          onChange={(e) => setNewToolName(e.target.value)}
                          placeholder="Имя инструмента (например, OpenCode)"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                        />
                        <input
                          value={newToolCmd}
                          onChange={(e) => setNewToolCmd(e.target.value)}
                          placeholder="Команда (например, opencode)"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                        />
                        <label className="flex items-center gap-2 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={newToolInWorkspace}
                            onChange={(e) =>
                              setNewToolInWorkspace(e.target.checked)
                            }
                            className="rounded bg-zinc-800 border-zinc-700"
                          />
                          Запускать в проекте
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddTool(ws.id)}
                            className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => {
                              setAddingToolWsId(null);
                              setNewToolName("");
                              setNewToolCmd("");
                              setNewToolInWorkspace(true);
                            }}
                            className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                    {toolCommands.map((tool) => (
                      <div
                        key={tool.id}
                        className="group flex items-center justify-between px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                        title={tool.command}
                      >
                        <button
                          onClick={() => handleRunTool(ws.id, tool)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium">{tool.name}</div>
                          <div className="font-mono text-zinc-400 truncate">
                            {tool.command}
                          </div>
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              beginEditTool(ws.id, tool);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700"
                            title="Edit tool"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTool(ws.id, tool.id);
                            }}
                            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete tool"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(ws.id, action)}
                        className="w-full text-left px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                        title={action.command}
                      >
                        <div className="font-medium">{action.label}</div>
                        <div className="font-mono text-zinc-400 truncate">
                          {action.command}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {previewCmd && (
        <div className="p-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 mb-2">Предпросмотр запуска</div>
          <div className="text-xs text-white bg-zinc-800 rounded p-2 mb-2">
            <div>Имя: {previewCmd.cmd.name}</div>
            <div>
              Команда:{" "}
              <span className="font-mono">{previewCmd.cmd.command}</span>
            </div>
            <div>Категория: {previewCmd.cmd.category || "—"}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                openCommand(previewCmd.wsId, previewCmd.cmd.id);
                setPreviewCmd(null);
              }}
              className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white"
            >
              Запустить
            </button>
            <button
              onClick={() => setPreviewCmd(null)}
              className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 text-center select-none">
          v1.0.0
        </div>
      </div>
    </div>
  );
};
