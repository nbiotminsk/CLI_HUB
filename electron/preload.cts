import {
  type IpcRenderer,
  type IpcRendererEvent,
  contextBridge,
} from "electron";

type Workspace = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceCommand = {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  lastRunning?: boolean;
  autoStart?: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

type CommandTemplate = {
  id: string;
  name: string;
  command: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

contextBridge.exposeInMainWorld("electronAPI", {
  // Workspaces
  selectDirectory: () =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("select-directory"),
  getWorkspaces: () =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("get-workspaces"),
  addWorkspace: (workspace: Workspace) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("add-workspace", workspace),
  updateWorkspace: (id: string, workspace: Partial<Workspace>) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("update-workspace", id, workspace),
  deleteWorkspace: (id: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("delete-workspace", id),

  getWorkspaceCommands: (workspaceId: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("get-workspace-commands", workspaceId),
  addWorkspaceCommand: (workspaceId: string, command: WorkspaceCommand) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke(
      "add-workspace-command",
      workspaceId,
      command,
    ),
  updateWorkspaceCommand: (
    workspaceId: string,
    commandId: string,
    updates: Partial<WorkspaceCommand>,
  ) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke(
      "update-workspace-command",
      workspaceId,
      commandId,
      updates,
    ),
  deleteWorkspaceCommand: (workspaceId: string, commandId: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke(
      "delete-workspace-command",
      workspaceId,
      commandId,
    ),
  getPackageScripts: (workspaceId: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("get-package-scripts", workspaceId),

  // Ports
  listPorts: () =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("list-ports"),
  freePort: (port: number, pid?: number) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("free-port", port, pid),

  // Processes
  startProcess: (id: string, command: string, cwd: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("start-process", id, command, cwd),
  interruptProcess: (id: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("interrupt-process", id),
  stopProcess: (id: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("stop-process", id),
  getProcessStatus: (id: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("get-process-status", id),

  // Terminal
  terminalWrite: (id: string, data: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("terminal-write", id, data),
  terminalResize: (id: string, cols: number, rows: number) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("terminal-resize", id, cols, rows),

  // Events
  onTerminalData: (callback: (projectId: string, data: string) => void) => {
    const handler = (
      _event: IpcRendererEvent,
      projectId: string,
      data: string,
    ) => callback(projectId, data);
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.on("terminal-data", handler);
    return () =>
      (
        window as unknown as { electron: { ipcRenderer: IpcRenderer } }
      ).electron.ipcRenderer.removeListener("terminal-data", handler);
  },
  onProcessExit: (callback: (projectId: string, exitCode: number) => void) => {
    const handler = (
      _event: IpcRendererEvent,
      projectId: string,
      exitCode: number,
    ) => callback(projectId, exitCode);
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.on("process-exit", handler);
    return () =>
      (
        window as unknown as { electron: { ipcRenderer: IpcRenderer } }
      ).electron.ipcRenderer.removeListener("process-exit", handler);
  },

  getTemplates: () =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("get-templates"),
  addTemplate: (tpl: CommandTemplate) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("add-template", tpl),
  updateTemplate: (id: string, updates: Partial<CommandTemplate>) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("update-template", id, updates),
  deleteTemplate: (id: string) =>
    (
      window as unknown as { electron: { ipcRenderer: IpcRenderer } }
    ).electron.ipcRenderer.invoke("delete-template", id),
});
