import React, { useEffect, useState } from "react";
import type { PortInfo } from "../types";
import { POLLING_INTERVAL_MS } from "../constants";

type FreeResult = { port: number; pid?: number; status: string };

interface PortsMonitorProps {
  isOpen?: boolean;
}

export function PortsMonitor({ isOpen = true }: PortsMonitorProps) {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeing, setFreeing] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await window.electronAPI.listPorts();
      setPorts(list);
    } catch {
      setError("Не удалось получить список портов");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;

    refresh();
    const id = window.setInterval(() => refresh(), POLLING_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isOpen, autoRefresh]);

  const handleFree = async (row: PortInfo) => {
    const key = `${row.port}:${row.pid}`;
    try {
      setFreeing((s) => ({ ...s, [key]: true }));
      const res: FreeResult = await window.electronAPI.freePort(
        row.port,
        row.pid,
      );
      if (res.status !== "freed") {
        setError(`Не удалось освободить порт ${row.port}`);
      }
      await refresh();
    } finally {
      setFreeing((s) => ({ ...s, [key]: false }));
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-zinc-200">
          Активные порты
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700"
              aria-label="Auto-refresh ports"
            />
            Автообновление
          </label>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
            aria-label="Refresh ports list"
          >
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 mb-2" role="alert">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto border border-zinc-800 rounded">
        <table className="w-full text-sm" role="grid" aria-label="Ports list">
          <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th
                className="text-left font-medium text-zinc-400 px-3 py-2"
                scope="col"
              >
                Порт
              </th>
              <th
                className="text-left font-medium text-zinc-400 px-3 py-2"
                scope="col"
              >
                PID
              </th>
              <th
                className="text-left font-medium text-zinc-400 px-3 py-2"
                scope="col"
              >
                Статус
              </th>
              <th
                className="text-left font-medium text-zinc-400 px-3 py-2"
                scope="col"
              >
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {ports.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={4}>
                  {isLoading ? "Загрузка…" : "Нет активных портов"}
                </td>
              </tr>
            )}
            {ports.map((p) => {
              const key = `${p.port}:${p.pid}`;
              return (
                <tr
                  key={key}
                  className="border-b border-zinc-900/60 hover:bg-zinc-900/40"
                >
                  <td className="px-3 py-2 font-mono text-zinc-200">
                    {p.port}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{p.pid}</td>
                  <td className="px-3 py-2 text-zinc-400">{p.status}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleFree(p)}
                      disabled={!!freeing[key]}
                      className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
                      aria-label={`Free port ${p.port}`}
                    >
                      Освободить
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
