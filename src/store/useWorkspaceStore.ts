import { create } from "zustand";
import type { Workspace, WorkspaceCommand, CommandTemplate } from "../types";
import { electronAPI } from "../lib/electron";

interface WindowWithPicker extends Window {
  showDirectoryPicker?: () => Promise<{ name?: string }>;
}

type Session = {
  sessionId: string;
  workspaceId: string;
  commandId: string;
  title: string;
  running: boolean;
  pid?: number;
  cwd?: string;
  keepOpen?: boolean;
  clearCounter?: number;
};

interface WorkspaceState {
  workspaces: Workspace[];
  commandsByWs: Record<string, WorkspaceCommand[]>;
  scriptsByWs: Record<string, Record<string, string>>;
  templates: CommandTemplate[];
  openSessions: Session[];
  activeSessionId: string | null;
  isWindowFocused?: boolean;

  loadWorkspaces: () => Promise<void>;
  addWorkspaceFromPicker: () => Promise<void>;
  addWorkspace: (ws: Workspace) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  loadCommands: (workspaceId: string) => Promise<void>;
  loadPackageScripts: (workspaceId: string) => Promise<void>;
  loadTemplates: () => Promise<void>;
  addTemplate: (tpl: CommandTemplate) => Promise<CommandTemplate>;
  updateTemplate: (
    id: string,
    updates: Partial<CommandTemplate>,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addCommand: (
    workspaceId: string,
    command: WorkspaceCommand,
  ) => Promise<WorkspaceCommand>;
  updateCommand: (
    workspaceId: string,
    commandId: string,
    updates: Partial<WorkspaceCommand>,
  ) => Promise<void>;
  deleteCommand: (workspaceId: string, commandId: string) => Promise<void>;

  openCommand: (workspaceId: string, commandId: string) => Promise<void>;
  openQuickCommand: (
    workspaceId: string,
    title: string,
    command: string,
    options?: { runInWorkspace?: boolean },
  ) => Promise<void>;
  createTerminalSession: (workspaceId?: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  interruptSession: (sessionId: string) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
  stopAllSessions: () => Promise<void>;
  setActiveSession: (sessionId: string | null) => void;
  nextSession: () => void;
  prevSession: () => void;
  setWindowFocused: (focused: boolean) => void;
  restartSessionToShell: (sessionId: string) => Promise<void>;
  clearSession: (sessionId: string) => void;
  restartSessionWithCommand: (
    sessionId: string,
    command: string,
    cwd: string,
    updates?: Partial<Session>,
  ) => Promise<void>;

  restoreAutoSessions: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  commandsByWs: {},
  scriptsByWs: {},
  templates: [],
  openSessions: [],
  activeSessionId: null,
  isWindowFocused: true,

  setActiveSession: (id) => set({ activeSessionId: id }),
  nextSession: () => {
    const st = get();
    if (st.openSessions.length <= 1) return;
    const idx = st.openSessions.findIndex(
      (s) => s.sessionId === st.activeSessionId,
    );
    if (idx === -1) return;
    const next = st.openSessions[(idx + 1) % st.openSessions.length];
    set({ activeSessionId: next.sessionId });
  },
  prevSession: () => {
    const st = get();
    if (st.openSessions.length <= 1) return;
    const idx = st.openSessions.findIndex(
      (s) => s.sessionId === st.activeSessionId,
    );
    if (idx === -1) return;
    const prev =
      st.openSessions[
        (idx - 1 + st.openSessions.length) % st.openSessions.length
      ];
    set({ activeSessionId: prev.sessionId });
  },
  setWindowFocused: (focused) => set({ isWindowFocused: focused }),
  restartSessionToShell: async (sessionId) => {
    const st = get();
    const session = st.openSessions.find((s) => s.sessionId === sessionId);
    if (!session) return;
    const cwd = session.cwd || "";
    const workspaceId = session.workspaceId;
    const commandId = session.commandId;
    const started = await electronAPI.startProcess(sessionId, "", cwd);
    const status = await electronAPI.getProcessStatus(sessionId);
    const isRunning =
      status.isRunning ||
      started.status === "started" ||
      started.status === "running";
    if (workspaceId && commandId) {
      try {
        await get().updateCommand(workspaceId, commandId, {
          lastRunning: false,
        });
      } catch {
        // Command may have been deleted; ignore
      }
    }
    set((state) => ({
      openSessions: state.openSessions.map((s) =>
        s.sessionId === sessionId
          ? {
              ...s,
              running: isRunning,
              pid: status.pid ?? started.pid,
              commandId: s.keepOpen ? s.commandId : "",
            }
          : s,
      ),
    }));
  },
  clearSession: (sessionId) => {
    set((state) => ({
      openSessions: state.openSessions.map((s) =>
        s.sessionId === sessionId
          ? { ...s, clearCounter: (s.clearCounter ?? 0) + 1 }
          : s,
      ),
    }));
  },
  restartSessionWithCommand: async (sessionId, command, cwd, updates) => {
    const st = get();
    const session = st.openSessions.find((s) => s.sessionId === sessionId);
    if (!session) return;
    const started = await electronAPI.startProcess(sessionId, command, cwd);
    const status = await electronAPI.getProcessStatus(sessionId);
    const isRunning =
      status.isRunning ||
      started.status === "started" ||
      started.status === "running";
    set((state) => ({
      openSessions: state.openSessions.map((s) =>
        s.sessionId === sessionId
          ? {
              ...s,
              ...updates,
              running: isRunning,
              pid: status.pid ?? started.pid,
              cwd,
            }
          : s,
      ),
      activeSessionId: sessionId,
    }));
  },

  loadWorkspaces: async () => {
    const list = await electronAPI.getWorkspaces();
    set({ workspaces: list });
    // Load commands for each workspace in parallel
    await Promise.all(
      list.flatMap((ws) => [
        get().loadCommands(ws.id),
        get().loadPackageScripts(ws.id),
      ]),
    );
  },

  addWorkspaceFromPicker: async () => {
    const result = await electronAPI.selectDirectory();
    let name: string | undefined;
    let pathStr: string | undefined;
    if (result) {
      name = result.name;
      pathStr = result.path;
    } else {
      // Browser fallback: try showDirectoryPicker; if not available, prompt
      try {
        const anyWin = window as WindowWithPicker;
        if (typeof anyWin.showDirectoryPicker === "function") {
          const handle = await anyWin.showDirectoryPicker();
          name = handle?.name ?? "Folder";
          pathStr = `fs:${name}`;
        } else {
          const input = prompt("Введите имя папки для добавления:");
          if (input && input.trim()) {
            name = input.trim();
            pathStr = `mock:${name}`;
          }
        }
      } catch {
        // ignore
      }
      if (!name || !pathStr) return;
    }
    const now = new Date().toISOString();
    const ws: Workspace = {
      id: crypto.randomUUID(),
      name,
      path: pathStr,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await electronAPI.addWorkspace(ws);
    set((state) => ({ workspaces: [...state.workspaces, saved] }));
    await get().loadCommands(saved.id);
    await get().loadPackageScripts(saved.id);
  },

  addWorkspace: async (ws) => {
    const saved = await electronAPI.addWorkspace(ws);
    set((state) => ({ workspaces: [...state.workspaces, saved] }));
  },

  deleteWorkspace: async (workspaceId) => {
    const sessionsToClose = get().openSessions.filter(
      (s) => s.workspaceId === workspaceId,
    );
    await Promise.all(
      sessionsToClose.map((s) => electronAPI.stopProcess(s.sessionId)),
    );
    await electronAPI.deleteWorkspace(workspaceId);
    set((state) => {
      const nextWorkspaces = state.workspaces.filter(
        (w) => w.id !== workspaceId,
      );
      const nextOpenSessions = state.openSessions.filter(
        (s) => s.workspaceId !== workspaceId,
      );
      let nextActive = state.activeSessionId;
      if (
        nextActive &&
        !nextOpenSessions.some((s) => s.sessionId === nextActive)
      ) {
        nextActive =
          nextOpenSessions.length > 0
            ? nextOpenSessions[nextOpenSessions.length - 1].sessionId
            : null;
      }
      const { [workspaceId]: _removedCommands, ...nextCommands } =
        state.commandsByWs;
      const { [workspaceId]: _removedScripts, ...nextScripts } =
        state.scriptsByWs;
      return {
        workspaces: nextWorkspaces,
        openSessions: nextOpenSessions,
        activeSessionId: nextActive,
        commandsByWs: nextCommands,
        scriptsByWs: nextScripts,
      };
    });
  },

  loadCommands: async (workspaceId) => {
    const commands = await electronAPI.getWorkspaceCommands(workspaceId);
    set((state) => ({
      commandsByWs: { ...state.commandsByWs, [workspaceId]: commands },
    }));
  },
  loadPackageScripts: async (workspaceId) => {
    const scripts = await electronAPI.getPackageScripts(workspaceId);
    set((state) => ({
      scriptsByWs: { ...state.scriptsByWs, [workspaceId]: scripts },
    }));
  },
  loadTemplates: async () => {
    const list = await electronAPI.getTemplates();
    set({ templates: list });
  },
  addTemplate: async (tpl) => {
    const saved = await electronAPI.addTemplate(tpl);
    set((state) => ({ templates: [...state.templates, saved] }));
    return saved;
  },
  updateTemplate: async (id, updates) => {
    const updated = await electronAPI.updateTemplate(id, updates);
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? updated : t)),
    }));
  },
  deleteTemplate: async (id) => {
    await electronAPI.deleteTemplate(id);
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
  },

  addCommand: async (workspaceId, command) => {
    const saved = await electronAPI.addWorkspaceCommand(workspaceId, command);
    await get().loadCommands(workspaceId);
    return saved;
  },

  updateCommand: async (workspaceId, commandId, updates) => {
    await electronAPI.updateWorkspaceCommand(workspaceId, commandId, updates);
    await get().loadCommands(workspaceId);
  },

  deleteCommand: async (workspaceId, commandId) => {
    await electronAPI.deleteWorkspaceCommand(workspaceId, commandId);
    await get().loadCommands(workspaceId);
  },

  openCommand: async (workspaceId, commandId) => {
    const commands = get().commandsByWs[workspaceId] || [];
    const cmd = commands.find((c) => c.id === commandId);
    const ws = get().workspaces.find((w) => w.id === workspaceId);
    if (!cmd || !ws) return;
    const sessionId = crypto.randomUUID();
    const runInWorkspace = cmd.runInWorkspace !== false;
    const cwd = runInWorkspace ? cmd.cwd || ws.path : "";
    const started = await electronAPI.startProcess(sessionId, cmd.command, cwd);
    const status = await electronAPI.getProcessStatus(sessionId);
    const isRunning =
      status.isRunning ||
      started.status === "started" ||
      started.status === "running";
    const session: Session = {
      sessionId,
      workspaceId,
      commandId,
      title: cmd.name,
      running: isRunning,
      pid: status.pid ?? started.pid,
      cwd,
      keepOpen: cmd.category === "tool",
      clearCounter: 0,
    };
    set((state) => ({
      openSessions: [...state.openSessions, session],
      activeSessionId: session.sessionId,
    }));
    if (cmd.category !== "tool") {
      await get().updateCommand(workspaceId, commandId, { lastRunning: true });
    }
  },

  openQuickCommand: async (workspaceId, title, command, options) => {
    const ws = get().workspaces.find((w) => w.id === workspaceId);
    const useWorkspace = options?.runInWorkspace !== false;
    const cwd = useWorkspace ? ws?.path ?? "" : "";
    const sessionId = crypto.randomUUID();
    const started = await electronAPI.startProcess(sessionId, command, cwd);
    const status = await electronAPI.getProcessStatus(sessionId);
    const isRunning =
      status.isRunning ||
      started.status === "started" ||
      started.status === "running";

    const session: Session = {
      sessionId,
      workspaceId: ws?.id ?? "",
      commandId: "",
      title,
      running: isRunning,
      pid: status.pid ?? started.pid,
      cwd,
      keepOpen: true,
      clearCounter: 0,
    };

    set((state) => ({
      openSessions: [...state.openSessions, session],
      activeSessionId: session.sessionId,
    }));
  },

  createTerminalSession: async (workspaceId?: string) => {
    let cwd = "";
    let title = "Terminal";

    if (workspaceId) {
      const ws = get().workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        cwd = ws.path;
        title = ws.name;
      }
    }

    const sessionId = crypto.randomUUID();
    // Start generic shell
    const started = await electronAPI.startProcess(sessionId, "", cwd);
    const status = await electronAPI.getProcessStatus(sessionId);
    const isRunning =
      status.isRunning ||
      started.status === "started" ||
      started.status === "running";

    const session: Session = {
      sessionId,
      workspaceId: workspaceId || "",
      commandId: "",
      title: title,
      running: isRunning,
      pid: status.pid ?? started.pid,
      cwd,
      keepOpen: false,
      clearCounter: 0,
    };

    set((state) => ({
      openSessions: [...state.openSessions, session],
      activeSessionId: session.sessionId,
    }));
  },

  closeSession: async (sessionId) => {
    const st = get();
    const session = st.openSessions.find((s) => s.sessionId === sessionId);
    if (!session) return;
    await electronAPI.stopProcess(sessionId);
    set((state) => {
      const idx = state.openSessions.findIndex(
        (s) => s.sessionId === sessionId,
      );
      const newSessions = state.openSessions.filter(
        (s) => s.sessionId !== sessionId,
      );
      let newActive = state.activeSessionId;
      if (state.activeSessionId === sessionId) {
        if (newSessions.length === 0) {
          newActive = null;
        } else {
          const pickIndex = Math.min(idx, newSessions.length - 1);
          newActive = newSessions[pickIndex].sessionId;
        }
      }
      return {
        openSessions: newSessions,
        activeSessionId: newActive,
      };
    });
    if (session.workspaceId && session.commandId) {
      try {
        await get().updateCommand(session.workspaceId, session.commandId, {
          lastRunning: false,
        });
      } catch {
        // Command may have been deleted; ignore
      }
    }
  },

  interruptSession: async (sessionId) => {
    await electronAPI.interruptProcess(sessionId);
  },

  stopSession: async (sessionId) => {
    await electronAPI.stopProcess(sessionId);
    const st = get();
    const session = st.openSessions.find((s) => s.sessionId === sessionId);
    set((state) => ({
      openSessions: state.openSessions.map((s) =>
        s.sessionId === sessionId ? { ...s, running: false, keepOpen: false } : s,
      ),
    }));
    if (session?.workspaceId && session.commandId) {
      try {
        await get().updateCommand(session.workspaceId, session.commandId, {
          lastRunning: false,
        });
      } catch {
        // Command may have been deleted; ignore
      }
    }
  },

  stopAllSessions: async () => {
    const running = get().openSessions.filter((s) => s.running);
    if (running.length === 0) return;
    await Promise.all(running.map((s) => get().stopSession(s.sessionId)));
  },

  restoreAutoSessions: async () => {
    const state = get();
    for (const ws of state.workspaces) {
      const cmds = state.commandsByWs[ws.id] || [];
      for (const cmd of cmds) {
        if (cmd.autoStart || cmd.lastRunning) {
          await get().openCommand(ws.id, cmd.id);
        }
      }
    }
  },
}));
