import type { ElectronAPI, Workspace, WorkspaceCommand, ProcessStatus, PortInfo } from '../types';

const hasReal = typeof window !== 'undefined' && !!(window as any).electronAPI;

const mem = {
  workspaces: [] as Workspace[],
  commandsByWs: new Map<string, WorkspaceCommand[]>(),
};

const fallback: ElectronAPI = {
  selectDirectory: async () => null,
  getWorkspaces: async () => [...mem.workspaces],
  addWorkspace: async (workspace: Workspace) => {
    const existing = mem.workspaces.find(w => w.path === workspace.path) || mem.workspaces.find(w => w.id === workspace.id);
    if (!existing) {
      mem.workspaces.push(workspace);
    }
    return workspace;
  },
  updateWorkspace: async (id: string, updates: Partial<Workspace>) => {
    const idx = mem.workspaces.findIndex(w => w.id === id);
    if (idx !== -1) {
      const updated = { ...mem.workspaces[idx], ...updates, updatedAt: new Date().toISOString() } as Workspace;
      mem.workspaces[idx] = updated;
      return updated;
    }
    return { id, name: updates.name || '', path: updates.path || '', createdAt: updates.createdAt || '', updatedAt: new Date().toISOString() } as Workspace;
  },
  deleteWorkspace: async (id: string) => {
    mem.workspaces = mem.workspaces.filter(w => w.id !== id);
    mem.commandsByWs.delete(id);
    return id;
  },
  getWorkspaceCommands: async (workspaceId: string) => {
    return [...(mem.commandsByWs.get(workspaceId) ?? [])];
  },
  addWorkspaceCommand: async (workspaceId: string, command: WorkspaceCommand) => {
    const list = mem.commandsByWs.get(workspaceId) ?? [];
    mem.commandsByWs.set(workspaceId, [...list, command]);
    return command;
  },
  updateWorkspaceCommand: async (workspaceId: string, commandId: string, updates: Partial<WorkspaceCommand>) => {
    const list = mem.commandsByWs.get(workspaceId) ?? [];
    const idx = list.findIndex(c => c.id === commandId);
    if (idx !== -1) {
      const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() } as WorkspaceCommand;
      const next = [...list];
      next[idx] = updated;
      mem.commandsByWs.set(workspaceId, next);
      return updated;
    }
    const updated: WorkspaceCommand = { id: commandId, name: updates.name || '', command: updates.command || '', createdAt: updates.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = [...list, updated];
    mem.commandsByWs.set(workspaceId, next);
    return updated;
  },
  deleteWorkspaceCommand: async (workspaceId: string, commandId: string) => {
    const list = mem.commandsByWs.get(workspaceId) ?? [];
    mem.commandsByWs.set(workspaceId, list.filter(c => c.id !== commandId));
    return commandId;
  },
  listPorts: async () => [] as PortInfo[],
  freePort: async (port: number, pid?: number) => ({ port, pid, status: 'noop' }),
  startProcess: async (id: string, _command: string, _cwd: string) => ({ projectId: id, pid: 0, status: 'started' }),
  interruptProcess: async (id: string) => ({ projectId: id, status: 'interrupting' }),
  stopProcess: async (id: string) => ({ projectId: id, status: 'stopping' }),
  getProcessStatus: async (id: string) => ({ projectId: id, isRunning: false, pid: 0 } as ProcessStatus),
  terminalWrite: async () => {},
  terminalResize: async () => {},
  onTerminalData: (_cb: (projectId: string, data: string) => void) => {
    return () => {};
  },
  onProcessExit: (_cb: (projectId: string, exitCode: number) => void) => {
    return () => {};
  },
};

export const electronAPI: ElectronAPI = hasReal ? (window as any).electronAPI : fallback;
export const isElectron = hasReal;
