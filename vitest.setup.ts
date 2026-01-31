import "@testing-library/jest-dom";
import type { ElectronAPI, Workspace, WorkspaceCommand } from "./src/types";

const mockAPI: ElectronAPI = {
  // Workspaces
  selectDirectory: async () => null,
  getWorkspaces: async () => [],
  addWorkspace: async (workspace: Workspace) => workspace,
  updateWorkspace: async (
    _id: string,
    workspace: Partial<Workspace> & { id: string },
  ) => ({ ...workspace, id: _id }),
  deleteWorkspace: async (_id: string) => _id,

  getWorkspaceCommands: async (_workspaceId: string) => {
    void _workspaceId;
    return [];
  },
  addWorkspaceCommand: async (
    _workspaceId: string,
    command: WorkspaceCommand,
  ) => command,
  updateWorkspaceCommand: async (
    _workspaceId: string,
    _commandId: string,
    updates: Partial<WorkspaceCommand>,
  ) => updates,
  deleteWorkspaceCommand: async (_workspaceId: string, commandId: string) =>
    commandId,

  // Ports
  listPorts: async () => [],
  freePort: async (port: number, pid?: number) => ({
    port,
    pid,
    status: "freed",
  }),

  // Processes
  startProcess: async (id: string, _command: string, _cwd: string) => {
    void _command;
    void _cwd;
    return {
      projectId: id,
      pid: 1234,
      status: "started",
    };
  },
  interruptProcess: async (id: string) => ({
    projectId: id,
    status: "interrupting",
  }),
  stopProcess: async (id: string) => ({ projectId: id, status: "stopping" }),
  getProcessStatus: async (id: string) => ({
    projectId: id,
    isRunning: true,
    pid: 1234,
  }),

  // Terminal
  terminalWrite: async () => {},
  terminalResize: async () => {},

  // Events
  onTerminalData: (callback: (projectId: string, data: string) => void) => {
    void callback;
    return () => {};
  },
  onProcessExit: (callback: (projectId: string, exitCode: number) => void) => {
    void callback;
    return () => {};
  },

  getTemplates: async () => [],
  addTemplate: async (tpl: WorkspaceCommand) => tpl,
  updateTemplate: async (_id: string, updates: Partial<WorkspaceCommand>) =>
    updates as WorkspaceCommand,
  deleteTemplate: async (id: string) => id,
} as unknown as ElectronAPI;

Object.defineProperty(window, "electronAPI", {
  value: mockAPI,
  writable: true,
});

// jsdom does not implement matchMedia; xterm expects it
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
