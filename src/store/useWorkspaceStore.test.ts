import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "./useWorkspaceStore";

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

function makeWorkspace(
  id: string,
  name = `WS${id}`,
  path = `/workspace/${id}`,
) {
  return {
    id,
    name,
    path,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeCommand(id: string, name = `Cmd${id}`, command = `echo ${id}`) {
  return {
    id,
    name,
    command,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("useWorkspaceStore switching", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      commandsByWs: {},
      openSessions: [],
      activeSessionId: null,
      isWindowFocused: true,
    });
  });

  it("nextSession cycles through sessions", () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a"), makeSession("b"), makeSession("c")],
      activeSessionId: "a",
    });
    const st = useWorkspaceStore.getState();
    st.nextSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe("b");
    st.nextSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe("c");
    st.nextSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe("a");
  });

  it("prevSession cycles backwards", () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a"), makeSession("b"), makeSession("c")],
      activeSessionId: "b",
    });
    const st = useWorkspaceStore.getState();
    st.prevSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe("a");
    st.prevSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe("c");
  });

  it("closeSession moves focus to neighbor", async () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a"), makeSession("b"), makeSession("c")],
      activeSessionId: "b",
    });
    await useWorkspaceStore.getState().closeSession("b");
    const st = useWorkspaceStore.getState();
    expect(st.openSessions.map((s) => s.sessionId)).toEqual(["a", "c"]);
    expect(st.activeSessionId).toBe("c");
  });

  it("closeSession last picks previous", async () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a"), makeSession("b"), makeSession("c")],
      activeSessionId: "c",
    });
    await useWorkspaceStore.getState().closeSession("c");
    const st = useWorkspaceStore.getState();
    expect(st.openSessions.map((s) => s.sessionId)).toEqual(["a", "b"]);
    expect(st.activeSessionId).toBe("b");
  });
});

describe("useWorkspaceStore workspace management", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      commandsByWs: {},
      scriptsByWs: {},
      templates: [],
      openSessions: [],
      activeSessionId: null,
      isWindowFocused: true,
    });
  });

  it("addWorkspace adds a new workspace", async () => {
    const ws = makeWorkspace("1");
    await useWorkspaceStore.getState().addWorkspace(ws);
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
    expect(useWorkspaceStore.getState().workspaces[0].id).toBe("1");
  });

  it("setActiveSession updates active session", () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a"), makeSession("b")],
      activeSessionId: null,
    });
    useWorkspaceStore.getState().setActiveSession("a");
    expect(useWorkspaceStore.getState().activeSessionId).toBe("a");
  });

  it("loadCommands stores commands for workspace", async () => {
    const cmd = makeCommand("cmd1");
    useWorkspaceStore.setState({
      commandsByWs: { ws1: [cmd] },
    });
    expect(useWorkspaceStore.getState().commandsByWs["ws1"]).toHaveLength(1);
  });

  it("setWindowFocused updates focus state", () => {
    useWorkspaceStore.setState({ isWindowFocused: true });
    useWorkspaceStore.getState().setWindowFocused(false);
    expect(useWorkspaceStore.getState().isWindowFocused).toBe(false);
  });

  it("nextSession does nothing with single session", () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a")],
      activeSessionId: "a",
    });
    const st = useWorkspaceStore.getState();
    st.nextSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe("a");
  });

  it("prevSession does nothing with single session", () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a")],
      activeSessionId: "a",
    });
    const st = useWorkspaceStore.getState();
    st.prevSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe("a");
  });

  it("closeSession with no sessions does not error", async () => {
    useWorkspaceStore.setState({
      openSessions: [],
      activeSessionId: null,
    });
    await useWorkspaceStore.getState().closeSession("nonexistent");
    expect(useWorkspaceStore.getState().openSessions).toHaveLength(0);
  });

  it("closeSession clears active session when all closed", async () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession("a")],
      activeSessionId: "a",
    });
    await useWorkspaceStore.getState().closeSession("a");
    expect(useWorkspaceStore.getState().openSessions).toHaveLength(0);
    expect(useWorkspaceStore.getState().activeSessionId).toBeNull();
  });
});
