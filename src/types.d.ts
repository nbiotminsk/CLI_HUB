export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceCommand {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  lastRunning?: boolean;
  autoStart?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessStatus {
  projectId: string;
  isRunning: boolean;
  pid?: number;
}

export interface PortInfo {
  port: number;
  pid: number;
  status: string;
  command?: string;
}

export interface ElectronAPI {
  selectDirectory: () => Promise<{ path: string; name: string; scripts?: Record<string, string> } | null>;
  getWorkspaces: () => Promise<Workspace[]>;
  addWorkspace: (workspace: Workspace) => Promise<Workspace>;
  updateWorkspace: (id: string, workspace: Partial<Workspace>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<string>;

  getWorkspaceCommands: (workspaceId: string) => Promise<WorkspaceCommand[]>;
  addWorkspaceCommand: (workspaceId: string, command: WorkspaceCommand) => Promise<WorkspaceCommand>;
  updateWorkspaceCommand: (workspaceId: string, commandId: string, updates: Partial<WorkspaceCommand>) => Promise<WorkspaceCommand>;
  deleteWorkspaceCommand: (workspaceId: string, commandId: string) => Promise<string>;

  listPorts: () => Promise<PortInfo[]>;
  freePort: (port: number, pid?: number) => Promise<{ port: number; pid?: number; status: string }>;
  
  startProcess: (id: string, command: string, cwd: string) => Promise<{ projectId: string; pid: number; status: string }>;
  interruptProcess: (id: string) => Promise<{ projectId: string; status: string }>;
  stopProcess: (id: string) => Promise<{ projectId: string; status: string }>;
  getProcessStatus: (id: string) => Promise<ProcessStatus>;
  
  terminalWrite: (id: string, data: string) => Promise<void>;
  terminalResize: (id: string, cols: number, rows: number) => Promise<void>;
  
  onTerminalData: (callback: (projectId: string, data: string) => void) => () => void;
  onProcessExit: (callback: (projectId: string, exitCode: number) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
