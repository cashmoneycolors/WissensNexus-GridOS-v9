import React, { useEffect, useMemo, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Card } from './ui';
import { apiGet } from '../lib/api';

type Task = { id: string; title: string };
type Note = { id: string; title: string };

export default function NeuralMap() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    apiGet<Task[]>('/api/tasks').then(setTasks).catch(() => setTasks([]));
    apiGet<Note[]>('/api/notes').then(setNotes).catch(() => setNotes([]));
  }, []);

  const nodes = useMemo(() => {
    const t = tasks.slice(0, 10).map((x, i) => ({ id: x.id, label: x.title, type: 'task', i }));
    const n = notes.slice(0, 10).map((x, i) => ({ id: x.id, label: x.title, type: 'note', i }));
    return [...t, ...n];
  }, [tasks, notes]);

  const width = 820;
  const height = 360;

  return (
    <ViewLayout title="Neural Map" subtitle="Live-Graph aus Tasks & Notes (SVG).">
      <Card className="p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {nodes.map((n, idx) => {
            const angle = (idx / Math.max(1, nodes.length)) * Math.PI * 2;
            const r = 120 + (idx % 2) * 40;
            const cx = width / 2 + Math.cos(angle) * r;
            const cy = height / 2 + Math.sin(angle) * r;
            return (
              <g key={n.id}>
                <circle cx={cx} cy={cy} r={18} fill={n.type === 'task' ? '#10b981' : '#3b82f6'} opacity="0.7" />
                <text x={cx + 24} y={cy + 4} fontSize="11" fill="#e2e8f0">
                  {n.label.slice(0, 18)}
                </text>
              </g>
            );
          })}
          <circle cx={width / 2} cy={height / 2} r={26} fill="#0f172a" stroke="#10b981" strokeWidth="2" />
          <text x={width / 2 - 22} y={height / 2 + 5} fontSize="11" fill="#a7f3d0">CORE</text>
        </svg>
        <div className="mt-2 text-xs text-slate-500">Knoten = Tasks/Notes. Live-Daten aus SQLite.</div>
      </Card>
    </ViewLayout>
  );
}
