import React, { useEffect, useMemo, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Badge, Button, Card } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Task = {
  id: string;
  title: string;
  done: number;
  priority: number;
  created_at: number;
};

export default function TaskMatrix() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    const load = () => apiGet<Task[]>('/api/tasks').then(setTasks).catch(() => setTasks([]));
    load();
    const i = setInterval(load, 3000); // Poll for updates
    return () => clearInterval(i);
  }, []);

  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);

  const addTask = async () => {
    if (!title.trim()) return;
    const row = await apiSend<Task>('/api/tasks', 'POST', { title, priority: 2 });
    setTasks((prev) => [row, ...prev]);
    setTitle('');
  };

  const toggle = async (t: Task) => {
    const newDone = t.done ? 0 : 1;
    await apiSend(`/api/tasks/${t.id}`, 'PATCH', { done: newDone });
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: newDone } : x)));
  };

  const remove = async (t: Task) => {
    await apiSend(`/api/tasks/${t.id}`, 'DELETE');
    const newTasks = tasks.filter((x) => x.id !== t.id);
    setTasks(newTasks);
  };

  return (
    <ViewLayout
      title="Task Matrix"
      subtitle="Echte Aufgabenliste mit Persistenz (SQLite)."
      right={<Badge tone={doneCount > 20 ? 'good' : 'warn'}>{doneCount}/{tasks.length} done</Badge>}
    >
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neue Task"
            className="flex-1 rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <Button onClick={addTask}>Add</Button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.slice(0, 30).map((t) => (
            <div
              key={t.id}
              className={
                'rounded-xl border px-3 py-3 text-left transition-colors ' +
                (t.done
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-slate-800/80 bg-slate-950/20 hover:bg-slate-900/25')
              }
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => toggle(t)}
                  className="truncate text-sm font-semibold text-slate-100"
                >
                  {t.title}
                </button>
                <div className="flex gap-2">
                  <Badge tone={t.done ? 'good' : 'neutral'}>{t.done ? 'Done' : 'Open'}</Badge>
                  <button
                    onClick={() => remove(t)}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ViewLayout>
  );
}
