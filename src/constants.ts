// Application constants

// Terminal
export const RESIZE_DEBOUNCE_MS = 100;

// Ports Monitor
export const POLLING_INTERVAL_MS = 3000;

// Process termination timeouts (in milliseconds)
export const SIGINT_TIMEOUT_MS = 1500;
export const SIGTERM_TIMEOUT_MS = 2000;
export const SIGKILL_TIMEOUT_MS = 500;

// Default terminal dimensions
export const DEFAULT_TERMINAL_COLS = 80;
export const DEFAULT_TERMINAL_ROWS = 30;

export type QuickAction = {
  id: string;
  label: string;
  command: string;
  runInWorkspace?: boolean;
};

export const PROJECT_TOOLS: QuickAction[] = [
  { id: "tool-gemini", label: "Gemini", command: "gemini", runInWorkspace: true },
  { id: "tool-claude", label: "Claude", command: "claude", runInWorkspace: true },
];

export const GLOBAL_TOOLS: QuickAction[] = [
  {
    id: "update-gemini",
    label: "Update Gemini",
    command: "npm update -g @google/gemini-cli",
    runInWorkspace: false,
  },
  {
    id: "update-claude",
    label: "Update Claude",
    command: "npm update -g @anthropic-ai/claude-code",
    runInWorkspace: false,
  },
  {
    id: "update-npm",
    label: "Update npm",
    command: "npm install -g npm@latest",
    runInWorkspace: false,
  },
];
