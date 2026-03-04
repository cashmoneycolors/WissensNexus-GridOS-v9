import React, { useEffect, useMemo, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card, Badge } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Note = {
  id: string;
  title: string;
  body: string;
  tags: string;
  created_at: number;
};

type Knowledge = {
  id: string;
  fact: string;
  created_at: number;
};

export default function MemoryVault() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('ops,core');
  const [tab, setTab] = useState<'notes' | 'knowledge'>('notes');

  useEffect(() => {
    apiGet<Note[]>('/api/notes').then(setNotes).catch(() => setNotes([]));
    apiGet<Knowledge[]>('/api/knowledge').then(setKnowledge).catch(() => setKnowledge([]));
  }, []);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => [n.title, n.body, n.tags].some((x) => x.toLowerCase().includes(q)));
  }, [notes, query]);

  const filteredKnowledge = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return knowledge;
    return knowledge.filter((k) => k.fact.toLowerCase().includes(q));
  }, [knowledge, query]);

  const addNote = async () => {
    if (!title.trim()) return;
    const row = await apiSend<Note>('/api/notes', 'POST', { title, body, tags });
    setNotes((prev) => [row, ...prev]);
    setTitle('');
    setBody('');
  };

  const deleteKnowledge = async (id: string) => {
    await apiSend(`/api/knowledge/${id}`, 'DELETE', {});
    setKnowledge((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <ViewLayout title="Memory Vault" subtitle="Persistente Notizen & AI-Wissen (Brain Dump).">
      <div className="grid gap-3 lg:grid-cols-[1fr,360px] h-full">
        <Card className="p-4 flex flex-col h-full">
          <div className="flex gap-2 mb-3 border-b border-slate-800 pb-2">
            <button
              onClick={() => setTab('notes')}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                tab === 'notes' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Notes ({notes.length})
            </button>
            <button
              onClick={() => setTab('knowledge')}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                tab === 'knowledge' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AI Learned Facts ({knowledge.length})
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche..."
            className="mb-3 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          
          <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {tab === 'notes' ? (
              filteredNotes.slice(0, 30).map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 relative group">
                  <div className="text-sm font-bold text-slate-100">{n.title}</div>
                  <div className="mt-1 text-xs text-slate-400 flex gap-2">
                     <Badge tone="neutral">{n.tags}</Badge>
                     <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-200 max-h-24 overflow-hidden whitespace-pre-wrap">{n.body}</div>
                </div>
              ))
            ) : (
              filteredKnowledge.map((k) => (
                <div key={k.id} className="rounded-xl border border-indigo-900/30 bg-indigo-950/10 p-3 flex justify-between items-start group">
                  <div>
                    <div className="text-xs font-mono text-indigo-400 mb-1">ID: {k.id}</div>
                    <div className="text-sm text-slate-200 font-medium">"{k.fact}"</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 h-6 px-2 text-xs"
                    onClick={() => deleteKnowledge(k.id)}
                  >
                    Vergessen
                  </Button>
                </div>
              ))
            )}
            
            {((tab === 'notes' && filteredNotes.length === 0) || (tab === 'knowledge' && filteredKnowledge.length === 0)) && (
               <div className="p-8 text-center text-slate-500 text-sm">Keine Einträge gefunden.</div>
            )}
          </div>
        </Card>

        <Card className="p-4 h-fit">
          <div className="text-sm font-bold">Neuer Eintrag</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel"
            className="mt-3 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Inhalt"
            className="mt-2 h-40 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma)"
            className="mt-2 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <Button className="mt-3" onClick={addNote}>Add Note</Button>
        </Card>
      </div>
    </ViewLayout>
  );
}
