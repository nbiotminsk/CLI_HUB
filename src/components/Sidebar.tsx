import React, { useState } from "react";
import {
  Plus,
  Play,
  Square,
  Terminal as TerminalIcon,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type { WorkspaceCommand } from "../types";
import { PROJECT_TOOLS } from "../constants";

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
    templates,
    loadTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
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
  const [scriptsOpenByWs, setScriptsOpenByWs] = useState<
    Record<string, boolean>
  >({});
  const [toolsOpenByWs, setToolsOpenByWs] = useState<Record<string, boolean>>(
    {},
  );
  const [addingGlobalTool, setAddingGlobalTool] = useState(false);
  const [newGlobalToolName, setNewGlobalToolName] = useState("");
  const [newGlobalToolCmd, setNewGlobalToolCmd] = useState("");
  const [editingGlobalToolId, setEditingGlobalToolId] = useState<string | null>(
    null,
  );
  const [editGlobalToolName, setEditGlobalToolName] = useState("");
  const [editGlobalToolCmd, setEditGlobalToolCmd] = useState("");

  const globalTools = templates.filter(
    (t) => !t.category || t.category === "global-tool",
  );
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
    action: (typeof PROJECT_TOOLS)[number],
  ) => {
    const runningSession = openSessions.find(
      (s) =>
        s.workspaceId === workspaceId &&
        s.title === action.label &&
        s.running,
    );
    if (runningSession) {
      setActiveSession(runningSession.sessionId);
      return;
    }
    openQuickCommand(workspaceId, action.label, action.command, {
      runInWorkspace: action.runInWorkspace,
    });
  };

  const handleGlobalTool = (tool: { name: string; command: string }) => {
    const runningSession = openSessions.find(
      (s) => s.workspaceId === "" && s.title === tool.name && s.running,
    );
    if (runningSession) {
      setActiveSession(runningSession.sessionId);
      return;
    }
    openQuickCommand("", tool.name, tool.command, {
      runInWorkspace: false,
    });
  };

  const handleAddGlobalTool = async () => {
    if (!newGlobalToolName || !newGlobalToolCmd) return;
    const now = new Date().toISOString();
    await addTemplate({
      id: crypto.randomUUID(),
      name: newGlobalToolName,
      command: newGlobalToolCmd,
      category: "global-tool",
      createdAt: now,
      updatedAt: now,
    });
    setAddingGlobalTool(false);
    setNewGlobalToolName("");
    setNewGlobalToolCmd("");
  };

  const beginEditGlobalTool = (toolId: string, name: string, command: string) => {
    setEditingGlobalToolId(toolId);
    setEditGlobalToolName(name);
    setEditGlobalToolCmd(command);
    setAddingGlobalTool(false);
  };

  const handleSaveGlobalTool = async () => {
    if (!editingGlobalToolId || !editGlobalToolName || !editGlobalToolCmd)
      return;
    await updateTemplate(editingGlobalToolId, {
      name: editGlobalToolName,
      command: editGlobalToolCmd,
      category: "global-tool",
    });
    setEditingGlobalToolId(null);
    setEditGlobalToolName("");
    setEditGlobalToolCmd("");
  };

  const handleDeleteGlobalTool = async (toolId: string) => {
    const ok = window.confirm("Удалить глобальную команду?");
    if (!ok) return;
    await deleteTemplate(toolId);
    if (editingGlobalToolId === toolId) {
      setEditingGlobalToolId(null);
      setEditGlobalToolName("");
      setEditGlobalToolCmd("");
    }
  };

  const handleRunTool = (workspaceId: string, tool: WorkspaceCommand) => {
    const runningSession = openSessions.find(
      (s) =>
        s.workspaceId === workspaceId &&
        s.commandId === tool.id &&
        s.running,
    );
    if (runningSession) {
      setActiveSession(runningSession.sessionId);
      return;
    }
    openCommand(workspaceId, tool.id);
  };

  const handleAddWorkspace = async () => {
    await addWorkspaceFromPicker();
  };

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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
    setToolsOpenByWs((prev) => ({ ...prev, [workspaceId]: true }));
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
          const isScriptsOpen = !!scriptsOpenByWs[ws.id];
          const isToolsOpen = !!toolsOpenByWs[ws.id];
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
                  {isExpanded ? (
                    <FolderOpen
                      size={14}
                      className="flex-shrink-0 text-zinc-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <Folder
                      size={14}
                      className="flex-shrink-0 text-zinc-400"
                      aria-hidden="true"
                    />
                  )}
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
                        className="group flex items-center justify-between gap-2 p-2 rounded hover:bg-zinc-800/40"
                      >
                        <div
                          className="flex flex-1 min-w-0 items-center gap-2 overflow-hidden cursor-pointer"
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
                        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    <button
                      onClick={() =>
                        setScriptsOpenByWs((prev) => ({
                          ...prev,
                          [ws.id]: !isScriptsOpen,
                        }))
                      }
                      className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500 hover:text-white"
                    >
                      {isScriptsOpen ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                      Scripts
                    </button>
                    {isScriptsOpen && (
                      <>
                        {scriptEntries.length === 0 && (
                          <div className="text-xs text-zinc-600">
                            Нет скриптов в package.json
                          </div>
                        )}
                        {scriptEntries.map(([name, cmd]) => {
                          const label = toNpmScriptCommand(name);
                          const runningSession = openSessions.find(
                            (s) =>
                              s.workspaceId === ws.id &&
                              s.title === label &&
                              s.running,
                          );
                          const isRunning = !!runningSession;
                          return (
                            <div
                              key={name}
                              className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                              title={cmd}
                            >
                              <button
                                onClick={() => {
                                  if (runningSession) {
                                    setActiveSession(runningSession.sessionId);
                                  } else {
                                    handleRunScript(ws.id, name);
                                  }
                                }}
                                className="flex-1 min-w-0 overflow-hidden text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <TerminalIcon
                                    size={12}
                                    className={
                                      isRunning ? "text-green-400" : "text-zinc-500"
                                    }
                                    aria-hidden="true"
                                  />
                                  <span className="font-medium truncate">
                                    {label}
                                  </span>
                                </div>
                                <div className="font-mono text-zinc-400 truncate">
                                  {cmd}
                                </div>
                              </button>
                              {isRunning && runningSession && (
                                <button
                                  onClick={() =>
                                    stopSession(runningSession.sessionId)
                                  }
                                  className="flex-shrink-0 p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Stop"
                                >
                                  <Square size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() =>
                          setToolsOpenByWs((prev) => ({
                            ...prev,
                            [ws.id]: !isToolsOpen,
                          }))
                        }
                        className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500 hover:text-white"
                      >
                        {isToolsOpen ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                        Tools
                      </button>
                      <button
                        onClick={() => {
                          setAddingToolWsId(ws.id);
                          setToolsOpenByWs((prev) => ({
                            ...prev,
                            [ws.id]: true,
                          }));
                        }}
                        className="text-[11px] text-zinc-400 hover:text-white"
                        title="Add tool"
                      >
                        + Tool
                      </button>
                    </div>
                    {isToolsOpen && (
                      <>
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
                          (() => {
                            const runningSession = openSessions.find(
                              (s) =>
                                s.workspaceId === ws.id &&
                                s.commandId === tool.id &&
                                s.running,
                            );
                            const isRunning = !!runningSession;
                            return (
                              <div
                                key={tool.id}
                                className="group flex items-center justify-between gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                                title={tool.command}
                              >
                                <button
                                  onClick={() => handleRunTool(ws.id, tool)}
                                  className="flex-1 min-w-0 overflow-hidden text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full ${isRunning ? "bg-green-500" : "bg-zinc-600"}`}
                                      aria-hidden="true"
                                    />
                                    <span className="font-medium truncate">
                                      {tool.name}
                                    </span>
                                  </div>
                                  <div className="font-mono text-zinc-400 truncate">
                                    {tool.command}
                                  </div>
                                </button>
                                <div className="flex flex-shrink-0 items-center gap-1">
                                  {isRunning && runningSession && (
                                    <button
                                      onClick={() =>
                                        stopSession(runningSession.sessionId)
                                      }
                                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                      title="Stop"
                                    >
                                      <Square size={12} />
                                    </button>
                                  )}
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
                              </div>
                            );
                          })()
                        ))}
                        {PROJECT_TOOLS.map((action) => {
                          const runningSession = openSessions.find(
                            (s) =>
                              s.workspaceId === ws.id &&
                              s.title === action.label,
                          );
                          const isRunning = !!runningSession?.running;
                          return (
                            <div
                              key={action.id}
                              className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                              title={action.command}
                            >
                              <button
                                onClick={() => handleQuickAction(ws.id, action)}
                                className="flex-1 min-w-0 overflow-hidden text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full ${isRunning ? "bg-green-500" : "bg-zinc-600"}`}
                                    aria-hidden="true"
                                  />
                                  <span className="font-medium truncate">
                                    {action.label}
                                  </span>
                                </div>
                                <div className="font-mono text-zinc-400 truncate">
                                  {action.command}
                                </div>
                              </button>
                              {isRunning && runningSession && (
                                <button
                                  onClick={() =>
                                    stopSession(runningSession.sessionId)
                                  }
                                  className="flex-shrink-0 p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Stop"
                                >
                                  <Square size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="p-2 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
            Global Tools
          </div>
          <button
            onClick={() => {
              setAddingGlobalTool(true);
              setEditingGlobalToolId(null);
              setEditGlobalToolName("");
              setEditGlobalToolCmd("");
            }}
            className="text-[11px] text-zinc-400 hover:text-white"
            title="Add global tool"
          >
            + Tool
          </button>
        </div>
        {editingGlobalToolId && (
          <div className="space-y-2 p-2 border border-zinc-800 rounded mb-2">
            <div className="text-xs text-zinc-400">
              Редактировать глобальную команду
            </div>
            <input
              value={editGlobalToolName}
              onChange={(e) => setEditGlobalToolName(e.target.value)}
              placeholder="Имя"
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
            />
            <input
              value={editGlobalToolCmd}
              onChange={(e) => setEditGlobalToolCmd(e.target.value)}
              placeholder="Команда"
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveGlobalTool}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setEditingGlobalToolId(null);
                  setEditGlobalToolName("");
                  setEditGlobalToolCmd("");
                }}
                className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
        {addingGlobalTool && (
          <div className="space-y-2 p-2 border border-zinc-800 rounded mb-2">
            <div className="text-xs text-zinc-400">Новая глобальная команда</div>
            <input
              value={newGlobalToolName}
              onChange={(e) => setNewGlobalToolName(e.target.value)}
              placeholder="Имя"
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
            />
            <input
              value={newGlobalToolCmd}
              onChange={(e) => setNewGlobalToolCmd(e.target.value)}
              placeholder="Команда"
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddGlobalTool}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setAddingGlobalTool(false);
                  setNewGlobalToolName("");
                  setNewGlobalToolCmd("");
                }}
                className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
        {globalTools.length === 0 && (
          <div className="text-xs text-zinc-600">Нет глобальных команд</div>
        )}
        {globalTools.map((tool) => (
          <div
            key={tool.id}
            className="group flex items-center justify-between gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
            title={tool.command}
          >
            <button
              onClick={() => handleGlobalTool(tool)}
              className="flex-1 min-w-0 overflow-hidden text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${openSessions.some((s) => s.workspaceId === "" && s.title === tool.name && s.running) ? "bg-green-500" : "bg-zinc-600"}`}
                  aria-hidden="true"
                />
                <span className="font-medium truncate">{tool.name}</span>
              </div>
              <div className="font-mono text-zinc-400 truncate">
                {tool.command}
              </div>
            </button>
            <div className="flex flex-shrink-0 items-center gap-1">
              {(() => {
                const runningSession = openSessions.find(
                  (s) => s.workspaceId === "" && s.title === tool.name,
                );
                if (!runningSession?.running) return null;
                return (
                  <button
                    onClick={() => stopSession(runningSession.sessionId)}
                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    title="Stop"
                  >
                    <Square size={12} />
                  </button>
                );
              })()}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  beginEditGlobalTool(tool.id, tool.name, tool.command);
                }}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700"
                title="Edit global tool"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGlobalTool(tool.id);
                }}
                className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Delete global tool"
              >
                <Trash2 size={12} />
              </button>
              </div>
            </div>
          </div>
        ))}
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
