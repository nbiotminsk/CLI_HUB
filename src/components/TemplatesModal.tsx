import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { CommandTemplate } from '../types';

type Props = {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (name: string, command: string) => void;
};

export const TemplatesModal: React.FC<Props> = ({ workspaceId, isOpen, onClose, onApply }) => {
  const { templates, loadTemplates, scriptsByWs, loadPackageScripts, addTemplate } = useWorkspaceStore();
  const [filter, setFilter] = useState('');
  const [tplName, setTplName] = useState('');
  const [tplCommand, setTplCommand] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
    loadPackageScripts(workspaceId);
  }, [isOpen, loadTemplates, loadPackageScripts, workspaceId]);

  const presets = useMemo<CommandTemplate[]>(() => [
    { id: 'preset-dev', name: 'NPM run dev', command: 'npm run dev', createdAt: '', updatedAt: '' },
    { id: 'preset-build', name: 'NPM run build', command: 'npm run build', createdAt: '', updatedAt: '' },
    { id: 'preset-start', name: 'NPM start', command: 'npm start', createdAt: '', updatedAt: '' },
  ], []);

  const scripts = scriptsByWs[workspaceId] || {};

  const filteredPresets = presets.filter(t => (t.name + ' ' + t.command).toLowerCase().includes(filter.toLowerCase()));
  const filteredTemplates = templates.filter(t => (t.name + ' ' + t.command).toLowerCase().includes(filter.toLowerCase()));
  const filteredScripts = Object.entries(scripts).filter(([k, v]) => (`${k} ${v}`).toLowerCase().includes(filter.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Шаблоны команд</div>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-white">Закрыть</button>
        </div>

        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Поиск по шаблонам и скриптам…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-zinc-800 rounded p-2">
            <div className="text-xs text-zinc-400 mb-2">Пресеты</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredPresets.map(t => (
                <button
                  key={t.id}
                  onClick={() => onApply(t.name, t.command)}
                  className="w-full text-left px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="font-mono text-zinc-400">{t.command}</div>
                </button>
              ))}
              {filteredPresets.length === 0 && <div className="text-xs text-zinc-600">Нет совпадений</div>}
            </div>
          </div>

          <div className="border border-zinc-800 rounded p-2">
            <div className="text-xs text-zinc-400 mb-2">Пользовательские</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => onApply(t.name, t.command)}
                  className="w-full text-left px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="font-mono text-zinc-400">{t.command}</div>
                </button>
              ))}
              {filteredTemplates.length === 0 && <div className="text-xs text-zinc-600">Нет шаблонов</div>}
            </div>
          </div>
        </div>

        <div className="border border-zinc-800 rounded p-2">
          <div className="text-xs text-zinc-400 mb-2">Скрипты package.json</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {filteredScripts.map(([name, cmd]) => (
              <button
                key={name}
                onClick={() => onApply(`npm run ${name}`, `npm run ${name}`)}
                className="w-full text-left px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
              >
                <div className="font-medium">{name}</div>
                <div className="font-mono text-zinc-400">{cmd}</div>
              </button>
            ))}
            {filteredScripts.length === 0 && <div className="text-xs text-zinc-600">Нет скриптов</div>}
          </div>
        </div>

        <div className="border border-zinc-800 rounded p-2">
          <div className="text-xs text-zinc-400 mb-2">Добавить новый шаблон</div>
          <div className="space-y-2">
            <input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Имя шаблона"
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm"
            />
            <input
              value={tplCommand}
              onChange={(e) => setTplCommand(e.target.value)}
              placeholder="Команда (например, npm start)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!tplName || !tplCommand) return;
                  const now = new Date().toISOString();
                  const tpl: CommandTemplate = { id: crypto.randomUUID(), name: tplName, command: tplCommand, createdAt: now, updatedAt: now };
                  await addTemplate(tpl);
                  setTplName('');
                  setTplCommand('');
                }}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
              >Сохранить шаблон</button>
              <button
                onClick={() => onApply(tplName, tplCommand)}
                className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white"
              >Применить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
