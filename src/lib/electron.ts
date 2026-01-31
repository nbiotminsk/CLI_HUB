import type {
  ElectronAPI,
  Workspace,
  WorkspaceCommand,
  ProcessStatus,
  PortInfo,
  CommandTemplate,
} from "../types";

const hasReal =
  typeof window !== "undefined" &&
  !!(window as { electronAPI?: ElectronAPI }).electronAPI;

// Logger utility for fallback mode
const logger = {
  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[electron.ts] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[electron.ts] ${message}`, ...args);
  },
};

const mem = {
  workspaces: [] as Workspace[],
  commandsByWs: new Map<string, WorkspaceCommand[]>(),
  templates: [] as {
    id: string;
    name: string;
    command: string;
    category?: string;
    createdAt: string;
    updatedAt: string;
  }[],
};

const fallback: ElectronAPI = {
  selectDirectory: async () => {
    logger.warn("selectDirectory called in browser fallback - returning null");
    return null;
  },
  getWorkspaces: async () => {
    logger.warn(
      "getWorkspaces called in browser fallback - returning mock data",
    );
    return [...mem.workspaces];
  },
  addWorkspace: async (workspace: Workspace) => {
    logger.warn("addWorkspace called in browser fallback");
    const existing =
      mem.workspaces.find((w) => w.path === workspace.path) ||
      mem.workspaces.find((w) => w.id === workspace.id);
    if (!existing) {
      mem.workspaces.push(workspace);
    }
    return workspace;
  },
  updateWorkspace: async (id: string, updates: Partial<Workspace>) => {
    logger.warn(`updateWorkspace called in browser fallback for id: ${id}`);
    const idx = mem.workspaces.findIndex((w) => w.id === id);
    if (idx !== -1) {
      const updated = {
        ...mem.workspaces[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      } as Workspace;
      mem.workspaces[idx] = updated;
      return updated;
    }
    return {
      id,
      name: updates.name || "",
      path: updates.path || "",
      createdAt: updates.createdAt || "",
      updatedAt: new Date().toISOString(),
    } as Workspace;
  },
  deleteWorkspace: async (id: string) => {
    logger.warn(`deleteWorkspace called in browser fallback for id: ${id}`);
    mem.workspaces = mem.workspaces.filter((w) => w.id !== id);
    mem.commandsByWs.delete(id);
    return id;
  },
  getWorkspaceCommands: async (_workspaceId: string) => {
    logger.warn(
      `getWorkspaceCommands called in browser fallback for workspace: ${_workspaceId}`,
    );
    return [...(mem.commandsByWs.get(_workspaceId) ?? [])];
  },
  addWorkspaceCommand: async (
    workspaceId: string,
    command: WorkspaceCommand,
  ) => {
    logger.warn(
      `addWorkspaceCommand called in browser fallback for workspace: ${workspaceId}`,
    );
    const list = mem.commandsByWs.get(workspaceId) ?? [];
    mem.commandsByWs.set(workspaceId, [...list, command]);
    return command;
  },
  updateWorkspaceCommand: async (
    workspaceId: string,
    commandId: string,
    updates: Partial<WorkspaceCommand>,
  ) => {
    logger.warn(
      `updateWorkspaceCommand called in browser fallback for workspace: ${workspaceId}, command: ${commandId}`,
    );
    const list = mem.commandsByWs.get(workspaceId) ?? [];
    const idx = list.findIndex((c) => c.id === commandId);
    if (idx !== -1) {
      const updated = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      } as WorkspaceCommand;
      const next = [...list];
      next[idx] = updated;
      mem.commandsByWs.set(workspaceId, next);
      return updated;
    }
    const updated: WorkspaceCommand = {
      id: commandId,
      name: updates.name || "",
      command: updates.command || "",
      createdAt: updates.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...list, updated];
    mem.commandsByWs.set(workspaceId, next);
    return updated;
  },
  deleteWorkspaceCommand: async (workspaceId: string, commandId: string) => {
    logger.warn(
      `deleteWorkspaceCommand called in browser fallback for workspace: ${workspaceId}, command: ${commandId}`,
    );
    const list = mem.commandsByWs.get(workspaceId) ?? [];
    mem.commandsByWs.set(
      workspaceId,
      list.filter((c) => c.id !== commandId),
    );
    return commandId;
  },
  getPackageScripts: async () => {
    logger.warn(
      "getPackageScripts called in browser fallback - returning empty",
    );
    return {};
  },
  getTemplates: async () => {
    logger.warn(
      "getTemplates called in browser fallback - returning mock data",
    );
    return [...mem.templates];
  },
  addTemplate: async (tpl) => {
    logger.warn("addTemplate called in browser fallback");
    const exists = mem.templates.find((t) => t.id === tpl.id);
    if (!exists) mem.templates.push(tpl);
    return tpl;
  },
  updateTemplate: async (id, updates) => {
    logger.warn(`updateTemplate called in browser fallback for id: ${id}`);
    const idx = mem.templates.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const updated = {
        ...mem.templates[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      mem.templates[idx] = updated;
      return updated as CommandTemplate;
    }
    const created: CommandTemplate = {
      id,
      name: updates.name || "",
      command: updates.command || "",
      category: updates.category,
      createdAt: updates["createdAt"] || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mem.templates.push(created);
    return created;
  },
  deleteTemplate: async (id) => {
    logger.warn(`deleteTemplate called in browser fallback for id: ${id}`);
    mem.templates = mem.templates.filter((t) => t.id !== id);
    return id;
  },
  listPorts: async () => {
    logger.warn("listPorts called in browser fallback - returning empty");
    return [] as PortInfo[];
  },
  freePort: async (port: number, pid?: number) => {
    logger.warn(`freePort called in browser fallback for port: ${port}`);
    return {
      port,
      pid,
      status: "noop",
    };
  },
  startProcess: async (id: string) => {
    logger.warn(`startProcess called in browser fallback for id: ${id}`);
    return {
      projectId: id,
      pid: 0,
      status: "started",
    };
  },
  interruptProcess: async (id: string) => {
    logger.warn(`interruptProcess called in browser fallback for id: ${id}`);
    return {
      projectId: id,
      status: "interrupting",
    };
  },
  stopProcess: async (id: string) => {
    logger.warn(`stopProcess called in browser fallback for id: ${id}`);
    return { projectId: id, status: "stopping" };
  },
  getProcessStatus: async (id: string) => {
    logger.warn(`getProcessStatus called in browser fallback for id: ${id}`);
    return { projectId: id, isRunning: false, pid: 0 } as ProcessStatus;
  },
  terminalWrite: async () => {
    logger.warn("terminalWrite called in browser fallback - no-op");
  },
  terminalResize: async () => {
    logger.warn("terminalResize called in browser fallback - no-op");
  },
  onTerminalData: () => {
    logger.warn(
      "onTerminalData called in browser fallback - events will not be received",
    );
    return () => {};
  },
  onProcessExit: () => {
    logger.warn(
      "onProcessExit called in browser fallback - events will not be received",
    );
    return () => {};
  },
};

export const electronAPI: ElectronAPI = hasReal
  ? (window as { electronAPI: ElectronAPI }).electronAPI
  : fallback;
export const isElectron = hasReal;
