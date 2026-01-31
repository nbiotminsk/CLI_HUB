import '@testing-library/jest-dom';

const mockAPI = {
  // Workspaces
  selectDirectory: async () => null,
  getWorkspaces: async () => [],
  addWorkspace: async (workspace: any) => workspace,
  updateWorkspace: async (_id: string, workspace: any) => ({ id: _id, ...workspace }),
  deleteWorkspace: async (_id: string) => _id,

  getWorkspaceCommands: async (_workspaceId: string) => [],
  addWorkspaceCommand: async (_workspaceId: string, command: any) => command,
  updateWorkspaceCommand: async (_workspaceId: string, _commandId: string, updates: any) => updates,
  deleteWorkspaceCommand: async (_workspaceId: string, commandId: string) => commandId,

  // Ports
  listPorts: async () => [],
  freePort: async (port: number, pid?: number) => ({ port, pid, status: 'freed' }),

  // Processes
  startProcess: async (id: string, _command: string, _cwd: string) => ({ projectId: id, pid: 1234, status: 'started' }),
  interruptProcess: async (id: string) => ({ projectId: id, status: 'interrupting' }),
  stopProcess: async (id: string) => ({ projectId: id, status: 'stopping' }),
  getProcessStatus: async (id: string) => ({ projectId: id, isRunning: true, pid: 1234 }),

  // Terminal
  terminalWrite: async () => {},
  terminalResize: async () => {},

  // Events
  onTerminalData: (callback: (projectId: string, data: string) => void) => {
    // Return cleanup
    return () => {};
  },
  onProcessExit: (callback: (projectId: string, exitCode: number) => void) => {
    // Return cleanup
    return () => {};
  },
} as any;

Object.defineProperty(window, 'electronAPI', {
  value: mockAPI,
  writable: true,
});

// jsdom does not implement matchMedia; xterm expects it
Object.defineProperty(window, 'matchMedia', {
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
