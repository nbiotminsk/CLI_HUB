# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Vite dev server + Electron with hot reload)
npm run dev:electron

# Build production app (outputs to release/ folder)
npm run dist

# Type checking
npm run check

# Linting
npm run lint

# Run tests
npm run test
npm run test:watch  # watch mode
```

## Architecture

CLI Hub is an Electron desktop app with a React/Vite frontend that manages terminal workflows.

### Project Structure

- **`electron/main.ts`** - Electron main process: window creation, PTY process management, IPC handlers
- **`electron/preload.cts`** - Preload script exposing `window.electronAPI` to renderer
- **`src/lib/electron.ts`** - Frontend bridge to Electron API with browser fallback
- **`src/store/useWorkspaceStore.ts`** - Zustand store managing workspaces, commands, sessions, templates
- **`src/types.d.ts`** - TypeScript interfaces for IPC communication

### Core Concepts

**Workspaces & Commands**: Workspaces are folders added by the user. Commands are stored per-workspace in `<workspace>/.clihub/commands.json`. Global workspaces list and templates are stored in `electron-store`.

**Terminal Sessions**: Each terminal runs in a `node-pty` process. The frontend maintains `Session` objects tracking running processes. Process lifecycle: `startProcess` → `onTerminalData` (output) → `interruptProcess`/`stopProcess` → `onProcessExit`.

**IPC Communication**:
- Renderer calls `window.electronAPI.*` methods
- Main process handles via `ipcMain.handle()`
- Events: `terminal-data` (output), `process-exit` (status)

**State Flow**: App uses `useWorkspaceStore` (Zustand) as the single source of truth. All Electron API calls go through `src/lib/electron.ts` which has a fallback implementation when running outside Electron.

### Key Patterns

- Keyboard shortcuts: `Ctrl+T` (new terminal), `Ctrl+W` (close), `Ctrl+Tab`/`Ctrl+Shift+Tab` (navigate)
- Components use lazy loading: `React.lazy(() => import(...))`
- xterm.js + FitAddon for terminal rendering
- Auto-restart sessions via `restoreAutoSessions()` on app load
- Process termination uses graceful escalation: SIGINT → SIGTERM → SIGKILL

### Testing

Tests use Vitest with jsdom. Mock `electronAPI` is set up in `vitest.setup.ts`. When adding tests, use `window.electronAPI` mock pattern from the setup file.
