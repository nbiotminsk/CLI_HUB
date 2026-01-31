import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import App from "./App";
import { useWorkspaceStore } from "./store/useWorkspaceStore";

function makeSession(id: string, title = `S${id}`) {
  return {
    sessionId: id,
    workspaceId: "",
    commandId: "",
    title,
    running: true,
    pid: 1,
    cwd: "",
  };
}

function keydown(key: string, init: KeyboardEventInit = {}) {
  const evt = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.defaultView!.dispatchEvent(evt);
}

describe("App tab switching", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      commandsByWs: {},
      openSessions: [],
      activeSessionId: null,
      isWindowFocused: true,
    });
  });

  it("Ctrl+Tab moves to next session", () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a"), makeSession("b"), makeSession("c")],
      activeSessionId: "a",
    });
    render(<App />);
    keydown("Tab", { ctrlKey: true });
    expect(useWorkspaceStore.getState().activeSessionId).toBe("b");
    keydown("Tab", { ctrlKey: true });
    expect(useWorkspaceStore.getState().activeSessionId).toBe("c");
  });

  it("Ctrl+Shift+Tab moves to previous session", () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a"), makeSession("b"), makeSession("c")],
      activeSessionId: "b",
    });
    render(<App />);
    keydown("Tab", { ctrlKey: true, shiftKey: true });
    expect(useWorkspaceStore.getState().activeSessionId).toBe("a");
  });
});
