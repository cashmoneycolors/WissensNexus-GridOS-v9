import React, { useEffect, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Prompt = {
  id: string;
  title: string;
  template: string;
  created_at: number;
};

export default function CognitiveLab() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('');

  useEffect(() => {
    apiGet<Prompt[]>('/api/prompts').then(setPrompts).catch(() => setPrompts([]));
  }, []);

  const addPrompt = async () => {
    if (!title.trim() || !template.trim()) return;
    const row = await apiSend<Prompt>('/api/prompts', 'POST', { title, template });
    setPrompts((prev) => [row, ...prev]);
    setTitle('');
    setTemplate('');
  };

  return (
    <ViewLayout title="Cognitive Lab" subtitle="Echte Prompt-Templates mit Persistenz.">
      <div className="grid gap-3 lg:grid-cols-[1fr,360px]">
        <Card className="p-4">
          <div className="space-y-2">
            {prompts.slice(0, 25).map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
                <div className="text-sm font-bold text-slate-100">{p.title}</div>
                <div className="mt-1 text-xs text-slate-400">{new Date(p.created_at).toLocaleString()}</div>
                <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{p.template}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-bold">Neuer Prompt</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel"
            className="mt-3 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Prompt-Template"
            className="mt-2 h-40 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <Button className="mt-3" onClick={addPrompt}>Add Prompt</Button>
        </Card>
      </div>
    </ViewLayout>
  );
}
