import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from './useWorkspaceStore';

function makeSession(id: string, title = `S${id}`) {
  return {
    sessionId: id,
    workspaceId: '',
    commandId: '',
    title,
    running: true,
    pid: 1,
    cwd: '',
  };
}

describe('useWorkspaceStore switching', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      commandsByWs: {},
      openSessions: [],
      activeSessionId: null,
      isWindowFocused: true,
    });
  });

  it('nextSession cycles through sessions', () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession('a'), makeSession('b'), makeSession('c')],
      activeSessionId: 'a',
    });
    const st = useWorkspaceStore.getState();
    st.nextSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe('b');
    st.nextSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe('c');
    st.nextSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe('a');
  });

  it('prevSession cycles backwards', () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession('a'), makeSession('b'), makeSession('c')],
      activeSessionId: 'b',
    });
    const st = useWorkspaceStore.getState();
    st.prevSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe('a');
    st.prevSession();
    expect(useWorkspaceStore.getState().activeSessionId).toBe('c');
  });

  it('closeSession moves focus to neighbor', async () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession('a'), makeSession('b'), makeSession('c')],
      activeSessionId: 'b',
    });
    await useWorkspaceStore.getState().closeSession('b');
    const st = useWorkspaceStore.getState();
    expect(st.openSessions.map(s => s.sessionId)).toEqual(['a', 'c']);
    expect(st.activeSessionId).toBe('c');
  });

  it('closeSession last picks previous', async () => {
    useWorkspaceStore.setState({
      openSessions: [makeSession('a'), makeSession('b'), makeSession('c')],
      activeSessionId: 'c',
    });
    await useWorkspaceStore.getState().closeSession('c');
    const st = useWorkspaceStore.getState();
    expect(st.openSessions.map(s => s.sessionId)).toEqual(['a', 'b']);
    expect(st.activeSessionId).toBe('b');
  });
});
