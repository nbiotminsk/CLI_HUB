import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  projectId: string;
  isActive: boolean;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ projectId, isActive }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle input
    term.onData((data) => {
      window.electronAPI.terminalWrite(projectId, data);
    });

    // Handle output
    const cleanup = window.electronAPI.onTerminalData((pid, data) => {
      if (pid === projectId) {
        term.write(data);
      }
    });
    
    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
          fitAddonRef.current.fit();
          if (xtermRef.current) {
            window.electronAPI.terminalResize(projectId, xtermRef.current.cols, xtermRef.current.rows);
          }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial resize
    setTimeout(() => {
        handleResize();
    }, 100);

    return () => {
      cleanup();
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, [projectId]);

  // Refit when active state changes
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
        setTimeout(() => {
            fitAddonRef.current?.fit();
            if (xtermRef.current) {
                 window.electronAPI.terminalResize(projectId, xtermRef.current.cols, xtermRef.current.rows);
                 xtermRef.current.focus();
            }
        }, 50);
    }
  }, [isActive, projectId]);

  return (
    <div 
      className={`w-full h-full bg-black p-2 ${isActive ? 'block' : 'hidden'}`} 
      ref={terminalRef} 
    />
  );
};
