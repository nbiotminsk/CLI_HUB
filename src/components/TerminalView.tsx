import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { electronAPI, isElectron } from "../lib/electron";

interface TerminalViewProps {
  projectId: string;
  isActive: boolean;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  projectId,
  isActive,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const readyRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isElectron) return;
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#000000",
        foreground: "#ffffff",
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    try {
      term.open(terminalRef.current);
      fitAddon.fit();
      readyRef.current = true;
    } catch {
      // Terminal may already be initialized
      readyRef.current = false;
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle input
    term.onData((data) => {
      electronAPI?.terminalWrite(projectId, data);
    });

    // Handle output
    const cleanup =
      electronAPI?.onTerminalData?.((pid, data) => {
        if (pid === projectId) {
          term.write(data);
        }
      }) ?? (() => {});

    // Handle resize
    const handleResize = () => {
      if (!readyRef.current) return;
      const el = terminalRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const visible =
        rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
      if (!visible) return;
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (xtermRef.current) {
          electronAPI?.terminalResize?.(
            projectId,
            xtermRef.current.cols,
            xtermRef.current.rows,
          );
        }
      }
    };

    window.addEventListener("resize", handleResize);

    // Use ResizeObserver for reliable resize detection
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    // Initial resize after a short delay to ensure DOM is ready
    requestAnimationFrame(() => {
      handleResize();
    });

    return () => {
      cleanup();
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      readyRef.current = false;
    };
  }, [projectId]);

  // Refit when active state changes
  useEffect(() => {
    if (!isElectron) return;
    if (isActive && fitAddonRef.current && readyRef.current) {
      requestAnimationFrame(() => {
        const el = terminalRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const visible =
          rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
        if (!visible) return;
        try {
          fitAddonRef.current?.fit();
          if (xtermRef.current) {
            electronAPI?.terminalResize?.(
              projectId,
              xtermRef.current.cols,
              xtermRef.current.rows,
            );
            xtermRef.current.focus();
          }
        } catch {
          // Resize may fail if element is not visible
        }
      });
    }
  }, [isActive, projectId]);

  return <div className="w-full h-full bg-black p-2" ref={terminalRef} />;
};
