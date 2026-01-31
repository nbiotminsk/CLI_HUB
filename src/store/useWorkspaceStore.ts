import { create } from 'zustand';
import type { Workspace, WorkspaceCommand, PortInfo } from '../types';

type Session = {
  sessionId: string;
  workspaceId: string;
  commandId: string;
  title: string;
  running: boolean;
  pid?: number;
  cwd?: string;
};

interface WorkspaceState {
  workspaces: Workspace[];
  commandsByWs: Record<string, WorkspaceCommand[]>;
  openSessions: Session[];
  activeSessionId: string | null;

  loadWorkspaces: () => Promise<void>;
  addWorkspaceFromPicker: () => Promise<void>;
  addWorkspace: (ws: Workspace) => Promise<void>;
  loadCommands: (workspaceId: string) => Promise<void>;
  addCommand: (workspaceId: string, command: WorkspaceCommand) => Promise<WorkspaceCommand>;
  updateCommand: (workspaceId: string, commandId: string, updates: Partial<WorkspaceCommand>) => Promise<void>;
  deleteCommand: (workspaceId: string, commandId: string) => Promise<void>;

  openCommand: (workspaceId: string, commandId: string) => Promise<void>;
  createTerminalSession: (workspaceId?: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  interruptSession: (sessionId: string) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
  setActiveSession: (sessionId: string | null) => void;

  restoreAutoSessions: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  commandsByWs: {},
  openSessions: [],
  activeSessionId: null,

  setActiveSession: (id) => set({ activeSessionId: id }),

  loadWorkspaces: async () => {
    const list = await window.electronAPI.getWorkspaces();
    set({ workspaces: list });
    // Load commands for each workspace
    for (const ws of list) {
      await get().loadCommands(ws.id);
    }
  },

  addWorkspaceFromPicker: async () => {
    const result = await window.electronAPI.selectDirectory();
    if (!result) return;
    const now = new Date().toISOString();
    const ws: Workspace = {
      id: crypto.randomUUID(),
      name: result.name,
      path: result.path,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await window.electronAPI.addWorkspace(ws);
    set((state) => ({ workspaces: [...state.workspaces, saved] }));
    await get().loadCommands(saved.id);
  },

  addWorkspace: async (ws) => {
    const saved = await window.electronAPI.addWorkspace(ws);
    set((state) => ({ workspaces: [...state.workspaces, saved] }));
  },

  loadCommands: async (workspaceId) => {
    const commands = await window.electronAPI.getWorkspaceCommands(workspaceId);
    set((state) => ({ commandsByWs: { ...state.commandsByWs, [workspaceId]: commands } }));
  },

  addCommand: async (workspaceId, command) => {
    const saved = await window.electronAPI.addWorkspaceCommand(workspaceId, command);
    await get().loadCommands(workspaceId);
    return saved;
  },

  updateCommand: async (workspaceId, commandId, updates) => {
    await window.electronAPI.updateWorkspaceCommand(workspaceId, commandId, updates);
    await get().loadCommands(workspaceId);
  },

  deleteCommand: async (workspaceId, commandId) => {
    await window.electronAPI.deleteWorkspaceCommand(workspaceId, commandId);
    await get().loadCommands(workspaceId);
  },

  openCommand: async (workspaceId, commandId) => {
    const commands = get().commandsByWs[workspaceId] || [];
    const cmd = commands.find((c) => c.id === commandId);
    const ws = get().workspaces.find((w) => w.id === workspaceId);
    if (!cmd || !ws) return;
    const sessionId = crypto.randomUUID();
    const cwd = cmd.cwd || ws.path;
    await window.electronAPI.startProcess(sessionId, cmd.command, cwd);
    const status = await window.electronAPI.getProcessStatus(sessionId);
    const session: Session = {
      sessionId,
      workspaceId,
      commandId,
      title: cmd.name,
      running: status.isRunning,
      pid: status.pid,
      cwd,
    };
    set((state) => ({
      openSessions: [...state.openSessions, session],
      activeSessionId: session.sessionId,
    }));
    await get().updateCommand(workspaceId, commandId, { lastRunning: true });
  },

  createTerminalSession: async (workspaceId?: string) => {
    let cwd = '';
    let title = 'Terminal';

    if (workspaceId) {
      const ws = get().workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        cwd = ws.path;
        title = ws.name;
      }
    }

    const sessionId = crypto.randomUUID();
    // Start generic shell
    await window.electronAPI.startProcess(sessionId, '', cwd);
    const status = await window.electronAPI.getProcessStatus(sessionId);

    const session: Session = {
      sessionId,
      workspaceId: workspaceId || '',
      commandId: '',
      title: title,
      running: status.isRunning,
      pid: status.pid,
      cwd,
    };

    set((state) => ({
      openSessions: [...state.openSessions, session],
      activeSessionId: session.sessionId,
    }));
  },

  closeSession: async (sessionId) => {
    const session = get().openSessions.find((s) => s.sessionId === sessionId);
    if (!session) return;
    await window.electronAPI.stopProcess(sessionId);
    set((state) => ({
      openSessions: state.openSessions.filter((s) => s.sessionId !== sessionId),
      activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
    }));
    await get().updateCommand(session.workspaceId, session.commandId, { lastRunning: false });
  },

  interruptSession: async (sessionId) => {
    await window.electronAPI.interruptProcess(sessionId);
  },

  stopSession: async (sessionId) => {
    await window.electronAPI.stopProcess(sessionId);
    set((state) => ({
      openSessions: state.openSessions.map((s) => s.sessionId === sessionId ? { ...s, running: false } : s),
    }));
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
