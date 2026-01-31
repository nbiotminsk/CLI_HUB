import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import pty from 'node-pty';
import os from 'os';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);

interface Project {
  id: string;
  name: string;
  path: string;
  command: string;
  autoOpenUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceCommand {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  lastRunning?: boolean;
  autoStart?: boolean;
  createdAt: string;
  updatedAt: string;
}

type CommandTemplate = {
  id: string;
  name: string;
  command: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

const store = new Store<{ workspaces: Workspace[]; projects: Project[]; templates: CommandTemplate[] }>({
  defaults: {
    workspaces: [],
    projects: [],
    templates: []
  }
});

let mainWindow: BrowserWindow | null = null;
const ptyProcesses: Record<string, pty.IPty> = {};
let resolvedPath: string | undefined;
const stopPromises: Record<string, Promise<void> | undefined> = {};
let isShuttingDown = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPidAlive(pid: number | undefined): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function getDescendantPids(rootPid: number): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync('ps', ['-A', '-o', 'pid=', '-o', 'ppid='], {
      env: process.env,
    });
    const lines = String(stdout ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const childrenByParent = new Map<number, number[]>();
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const pid = Number(parts[0]);
      const ppid = Number(parts[1]);
      if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
      const arr = childrenByParent.get(ppid) ?? [];
      arr.push(pid);
      childrenByParent.set(ppid, arr);
    }

    const result: number[] = [];
    const stack: number[] = [rootPid];
    const visited = new Set<number>();
    while (stack.length > 0) {
      const current = stack.pop()!;
      const children = childrenByParent.get(current) ?? [];
      for (const child of children) {
        if (visited.has(child)) continue;
        visited.add(child);
        result.push(child);
        stack.push(child);
      }
    }
    return result;
  } catch {
    return [];
  }
}

async function killProcessTree(rootPid: number, signal: NodeJS.Signals): Promise<void> {
  const descendants = await getDescendantPids(rootPid);
  const all = [...descendants, rootPid].filter((pid) => pid > 0);
  for (let i = all.length - 1; i >= 0; i--) {
    const pid = all[i];
    try {
      process.kill(pid, signal);
    } catch {}
  }
}

const shellOnlyByProject: Record<string, boolean> = {};

async function terminatePty(projectId: string, mode: 'interrupt' | 'stop'): Promise<void> {
  if (stopPromises[projectId]) return stopPromises[projectId];
  const ptyProcess = ptyProcesses[projectId];
  const pid = ptyProcess?.pid;
  if (!ptyProcess || !pid) return;

  const task = (async () => {
    if (mode === 'interrupt') {
      const shellOnly = !!shellOnlyByProject[projectId];
      try { ptyProcess.write('\x03'); } catch {}
      if (shellOnly) return;
      await sleep(1500);
      if (!isPidAlive(pid)) return;
      await killProcessTree(pid, 'SIGINT');
      await sleep(1500);
      if (!isPidAlive(pid)) return;
      await killProcessTree(pid, 'SIGTERM');
      await sleep(2000);
      if (!isPidAlive(pid)) return;
      await killProcessTree(pid, 'SIGKILL');
      await sleep(500);
      return;
    }

    await killProcessTree(pid, 'SIGTERM');
    await sleep(2000);
    if (!isPidAlive(pid)) return;

    await killProcessTree(pid, 'SIGKILL');
    await sleep(500);
  })()
    .finally(() => {
      try {
        ptyProcess.kill();
      } catch {}
      delete ptyProcesses[projectId];
      delete stopPromises[projectId];
      delete shellOnlyByProject[projectId];
    });

  stopPromises[projectId] = task;
  return task;
}

async function resolveLoginShellPath(shellPath: string): Promise<string | undefined> {
  try {
    const shellBase = path.basename(shellPath);
    const isPowershell = shellBase.toLowerCase().includes('powershell');
    if (isPowershell) return process.env.PATH;

    const { stdout } = await execFileAsync(shellPath, ['-ilc', 'echo -n "$PATH"'], {
      env: process.env,
    });
    const out = String(stdout ?? '').trim();
    return out || process.env.PATH;
  } catch {
    return process.env.PATH;
  }
}

function getShellArgs(shellPath: string, commandStr: string): string[] {
  const shellBase = path.basename(shellPath).toLowerCase();
  
  if (!commandStr || commandStr.trim() === '') {
      return [];
  }

  if (shellBase.includes('powershell')) return ['-NoLogo', '-NoProfile', '-Command', commandStr];
  if (shellBase.includes('cmd.exe')) return ['/d', '/s', '/c', commandStr];
  if (shellBase.includes('zsh') || shellBase.includes('bash')) return ['-ilc', commandStr];
  return ['-lc', commandStr];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Open URLs in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      import('electron').then(({ shell }) => shell.openExternal(url));
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const shellPath = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh');
  resolvedPath = await resolveLoginShellPath(shellPath);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  const ids = Object.keys(ptyProcesses);
  ids.forEach((id) => {
    terminatePty(id, 'stop');
  });
});

async function shutdownAll(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  const ids = Object.keys(ptyProcesses);
  await Promise.allSettled(ids.map((id) => terminatePty(id, 'stop')));
}

app.on('before-quit', () => {
  shutdownAll();
});

app.on('will-quit', () => {
  shutdownAll();
});

process.on('SIGTERM', () => {
  shutdownAll();
});

process.on('SIGINT', () => {
  shutdownAll();
});

process.on('beforeExit', () => {
  shutdownAll();
});

async function readPackageJsonScripts(projectPath: string): Promise<Record<string, string>> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    return packageJson?.scripts ?? {};
  } catch {
    return {};
  }
}

ipcMain.handle('select-directory', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const selectedPath = result.filePaths[0];
  const scripts = await readPackageJsonScripts(selectedPath);
  const name = path.basename(selectedPath);

  return {
    path: selectedPath,
    name,
    scripts,
  };
});

ipcMain.handle('get-package-scripts', async (_event, workspaceId: string) => {
  const ws = getWorkspaceById(workspaceId);
  if (!ws) return {};
  return readPackageJsonScripts(ws.path);
});

type PortInfo = {
  port: number;
  pid: number;
  status: string;
  command?: string;
};

async function listListeningPorts(): Promise<PortInfo[]> {
  try {
    const { stdout } = await execFileAsync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], {
      env: process.env,
    });
    const lines = String(stdout ?? '')
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (lines.length === 0) return [];
    const dataLines = lines.slice(1);
    const result: PortInfo[] = [];
    const seen = new Set<string>();
    for (const line of dataLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;
      const command = parts[0];
      const pid = Number(parts[1]);
      if (!Number.isFinite(pid)) continue;
      const name = parts.slice(8).join(' ');
      const match = name.match(/:(\d+)\s+\(LISTEN\)/);
      if (!match) continue;
      const port = Number(match[1]);
      if (!Number.isFinite(port)) continue;
      const key = `${port}:${pid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ port, pid, status: 'LISTEN', command });
    }
    result.sort((a, b) => a.port - b.port || a.pid - b.pid);
    return result;
  } catch {
    return [];
  }
}

ipcMain.handle('list-ports', async () => {
  return listListeningPorts();
});

ipcMain.handle('get-templates', async () => {
  return store.get('templates');
});

ipcMain.handle('add-template', async (_event, tpl: CommandTemplate) => {
  const list = store.get('templates');
  const exists = list.find(t => t.id === tpl.id);
  const next = exists ? list : [...list, tpl];
  store.set('templates', next);
  return tpl;
});

ipcMain.handle('update-template', async (_event, id: string, updates: Partial<CommandTemplate>) => {
  const list = store.get('templates');
  const idx = list.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Template not found');
  const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  store.set('templates', list);
  return updated as CommandTemplate;
});

ipcMain.handle('delete-template', async (_event, id: string) => {
  const list = store.get('templates');
  store.set('templates', list.filter(t => t.id !== id));
  return id;
});
ipcMain.handle('free-port', async (event, port: number, pid?: number) => {
  const targetPid = pid ?? (await (async () => {
    try {
      const { stdout } = await execFileAsync('lsof', ['-ti', `tcp:${port}`], { env: process.env });
      const first = String(stdout ?? '').trim().split('\n').map((s) => s.trim()).filter(Boolean)[0];
      return first ? Number(first) : undefined;
    } catch {
      return undefined;
    }
  })());

  if (!targetPid || !Number.isFinite(targetPid)) return { port, status: 'not-found' };

  await killProcessTree(targetPid, 'SIGTERM');
  await sleep(1500);
  if (isPidAlive(targetPid)) {
    await killProcessTree(targetPid, 'SIGKILL');
  }
  return { port, pid: targetPid, status: 'freed' };
});

function commandsConfigPath(workspacePath: string): string {
  return path.join(workspacePath, '.clihub', 'commands.json');
}

async function readCommandsFile(workspacePath: string): Promise<WorkspaceCommand[]> {
  try {
    const filePath = commandsConfigPath(workspacePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const commands = Array.isArray(parsed?.commands) ? parsed.commands : [];
    return commands as WorkspaceCommand[];
  } catch {
    return [];
  }
}

async function writeCommandsFile(workspacePath: string, commands: WorkspaceCommand[]): Promise<void> {
  const dirPath = path.join(workspacePath, '.clihub');
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = commandsConfigPath(workspacePath);
  const payload = { version: 1, commands };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

function getWorkspaceById(workspaceId: string): Workspace | undefined {
  const workspaces = store.get('workspaces');
  return workspaces.find((w) => w.id === workspaceId);
}

async function migrateLegacyProjectsIfNeeded(): Promise<void> {
  const workspaces = store.get('workspaces');
  if (workspaces.length > 0) return;
  const projects = store.get('projects');
  if (!projects || projects.length === 0) return;

  const byPath = new Map<string, Project[]>();
  for (const p of projects) {
    const arr = byPath.get(p.path) ?? [];
    arr.push(p);
    byPath.set(p.path, arr);
  }

  const now = new Date().toISOString();
  const migrated: Workspace[] = [];
  for (const [workspacePath, items] of byPath.entries()) {
    const ws: Workspace = {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: path.basename(workspacePath),
      path: workspacePath,
      createdAt: now,
      updatedAt: now,
    };
    migrated.push(ws);

    const commands: WorkspaceCommand[] = items.map((p) => ({
      id: p.id,
      name: p.name,
      command: p.command,
      cwd: p.path,
      lastRunning: false,
      autoStart: false,
      createdAt: p.createdAt ?? now,
      updatedAt: p.updatedAt ?? now,
    }));
    await writeCommandsFile(workspacePath, commands);
  }

  store.set('workspaces', migrated);
  store.set('projects', []);
}

ipcMain.handle('get-workspaces', async () => {
  await migrateLegacyProjectsIfNeeded();
  return store.get('workspaces');
});

ipcMain.handle('add-workspace', async (event, workspace: Workspace) => {
  await migrateLegacyProjectsIfNeeded();
  const workspaces = store.get('workspaces');
  const existing = workspaces.find((w) => w.path === workspace.path);
  if (existing) return existing;
  store.set('workspaces', [...workspaces, workspace]);
  return workspace;
});

ipcMain.handle('update-workspace', async (event, workspaceId: string, updates: Partial<Workspace>) => {
  await migrateLegacyProjectsIfNeeded();
  const workspaces = store.get('workspaces');
  const index = workspaces.findIndex((w) => w.id === workspaceId);
  if (index === -1) throw new Error('Workspace not found');
  const updated = { ...workspaces[index], ...updates, updatedAt: new Date().toISOString() };
  workspaces[index] = updated;
  store.set('workspaces', workspaces);
  return updated;
});

ipcMain.handle('delete-workspace', async (event, workspaceId: string) => {
  await migrateLegacyProjectsIfNeeded();
  const workspaces = store.get('workspaces');
  store.set('workspaces', workspaces.filter((w) => w.id !== workspaceId));
  return workspaceId;
});

ipcMain.handle('get-workspace-commands', async (event, workspaceId: string) => {
  await migrateLegacyProjectsIfNeeded();
  const ws = getWorkspaceById(workspaceId);
  if (!ws) throw new Error('Workspace not found');
  return readCommandsFile(ws.path);
});

ipcMain.handle('add-workspace-command', async (event, workspaceId: string, command: WorkspaceCommand) => {
  await migrateLegacyProjectsIfNeeded();
  const ws = getWorkspaceById(workspaceId);
  if (!ws) throw new Error('Workspace not found');
  const commands = await readCommandsFile(ws.path);
  const updated = [...commands, command];
  await writeCommandsFile(ws.path, updated);
  return command;
});

ipcMain.handle('update-workspace-command', async (event, workspaceId: string, commandId: string, updates: Partial<WorkspaceCommand>) => {
  await migrateLegacyProjectsIfNeeded();
  const ws = getWorkspaceById(workspaceId);
  if (!ws) throw new Error('Workspace not found');
  const commands = await readCommandsFile(ws.path);
  const index = commands.findIndex((c) => c.id === commandId);
  if (index === -1) throw new Error('Command not found');
  const updated = { ...commands[index], ...updates, updatedAt: new Date().toISOString() };
  commands[index] = updated;
  await writeCommandsFile(ws.path, commands);
  return updated;
});

ipcMain.handle('delete-workspace-command', async (event, workspaceId: string, commandId: string) => {
  await migrateLegacyProjectsIfNeeded();
  const ws = getWorkspaceById(workspaceId);
  if (!ws) throw new Error('Workspace not found');
  const commands = await readCommandsFile(ws.path);
  await writeCommandsFile(ws.path, commands.filter((c) => c.id !== commandId));
  return commandId;
});

// Process Management
ipcMain.handle('start-process', (event, projectId: string, commandStr: string, cwd: string) => {
  if (ptyProcesses[projectId]) {
    // Already running
    return { projectId, pid: ptyProcesses[projectId].pid, status: 'running' };
  }

  const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
  const args = getShellArgs(shell, commandStr);
  const env = { ...process.env, ...(resolvedPath ? { PATH: resolvedPath } : {}) };
  const workingDir = cwd || os.homedir();

  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: workingDir,
    env: env as any
  });

  ptyProcesses[projectId] = ptyProcess;
  shellOnlyByProject[projectId] = args.length === 0;

  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-data', projectId, data);
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    delete ptyProcesses[projectId];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-exit', projectId, exitCode);
    }
  });

  return { projectId, pid: ptyProcess.pid, status: 'started' };
});

ipcMain.handle('interrupt-process', (event, projectId: string) => {
  if (!ptyProcesses[projectId]) return { projectId, status: 'not-found' };
  terminatePty(projectId, 'interrupt');
  return { projectId, status: 'interrupting' };
});

ipcMain.handle('stop-process', (event, projectId: string) => {
  if (!ptyProcesses[projectId]) return { projectId, status: 'not-found' };
  terminatePty(projectId, 'stop');
  return { projectId, status: 'stopping' };
});

ipcMain.handle('get-process-status', (event, projectId: string) => {
    return { 
        projectId, 
        isRunning: !!ptyProcesses[projectId],
        pid: ptyProcesses[projectId]?.pid
    };
});

ipcMain.handle('terminal-write', (event, projectId: string, data: string) => {
  const ptyProcess = ptyProcesses[projectId];
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

ipcMain.handle('terminal-resize', (event, projectId: string, cols: number, rows: number) => {
  const ptyProcess = ptyProcesses[projectId];
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
  }
});
