import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Workspaces
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getWorkspaces: () => ipcRenderer.invoke('get-workspaces'),
  addWorkspace: (workspace: any) => ipcRenderer.invoke('add-workspace', workspace),
  updateWorkspace: (id: string, workspace: any) => ipcRenderer.invoke('update-workspace', id, workspace),
  deleteWorkspace: (id: string) => ipcRenderer.invoke('delete-workspace', id),

  getWorkspaceCommands: (workspaceId: string) => ipcRenderer.invoke('get-workspace-commands', workspaceId),
  addWorkspaceCommand: (workspaceId: string, command: any) => ipcRenderer.invoke('add-workspace-command', workspaceId, command),
  updateWorkspaceCommand: (workspaceId: string, commandId: string, updates: any) => ipcRenderer.invoke('update-workspace-command', workspaceId, commandId, updates),
  deleteWorkspaceCommand: (workspaceId: string, commandId: string) => ipcRenderer.invoke('delete-workspace-command', workspaceId, commandId),
  getPackageScripts: (workspaceId: string) => ipcRenderer.invoke('get-package-scripts', workspaceId),

  // Ports
  listPorts: () => ipcRenderer.invoke('list-ports'),
  freePort: (port: number, pid?: number) => ipcRenderer.invoke('free-port', port, pid),

  // Processes
  startProcess: (id: string, command: string, cwd: string) => ipcRenderer.invoke('start-process', id, command, cwd),
  interruptProcess: (id: string) => ipcRenderer.invoke('interrupt-process', id),
  stopProcess: (id: string) => ipcRenderer.invoke('stop-process', id),
  getProcessStatus: (id: string) => ipcRenderer.invoke('get-process-status', id),

  // Terminal
  terminalWrite: (id: string, data: string) => ipcRenderer.invoke('terminal-write', id, data),
  terminalResize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal-resize', id, cols, rows),

  // Events
  onTerminalData: (callback: (projectId: string, data: string) => void) => {
    const handler = (_event: any, projectId: string, data: string) => callback(projectId, data);
    ipcRenderer.on('terminal-data', handler);
    return () => ipcRenderer.removeListener('terminal-data', handler);
  },
  onProcessExit: (callback: (projectId: string, exitCode: number) => void) => {
    const handler = (_event: any, projectId: string, exitCode: number) => callback(projectId, exitCode);
    ipcRenderer.on('process-exit', handler);
    return () => ipcRenderer.removeListener('process-exit', handler);
  },

  getTemplates: () => ipcRenderer.invoke('get-templates'),
  addTemplate: (tpl: any) => ipcRenderer.invoke('add-template', tpl),
  updateTemplate: (id: string, updates: any) => ipcRenderer.invoke('update-template', id, updates),
  deleteTemplate: (id: string) => ipcRenderer.invoke('delete-template', id),
});
