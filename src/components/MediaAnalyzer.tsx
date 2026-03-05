import React, { useEffect, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card } from './ui';
import { apiGet, apiSend, apiUpload } from '../lib/api';

type Analysis = {
  id: string;
  kind: string;
  summary: string;
  stats: string | { words?: number; chars?: number; bytes?: number };
  created_at?: number;
};

export default function MediaAnalyzer() {
  const [text, setText] = useState('Sample text for analysis.');
  const [history, setHistory] = useState<Analysis[]>([]);

  useEffect(() => {
    apiGet<Analysis[]>('/api/media').then(setHistory).catch(() => setHistory([]));
  }, []);

  const analyzeText = async () => {
    const res = await apiSend<Analysis>('/api/media/analyze', 'POST', { text });
    setHistory((prev) => [res, ...prev]);
  };

  const analyzeFile = async (file?: File | null) => {
    if (!file) return;
    const res = await apiUpload<Analysis>('/api/media/analyze', file);
    setHistory((prev) => [res, ...prev]);
  };

  return (
    <ViewLayout title="Media Analyzer" subtitle="Text/File Analyse mit Persistenz.">
      <div className="grid gap-3 lg:grid-cols-[1fr,360px]">
        <Card className="p-4">
          <label htmlFor="media-analyzer-text" className="text-xs text-slate-400">Input Text</label>
          <textarea
            id="media-analyzer-text"
            aria-label="Input text for analysis"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-40 w-full rounded-xl border border-slate-800/80 bg-black/40 p-3 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={analyzeText}>Analyze Text</Button>
            <label className="cursor-pointer rounded-full border border-slate-800/80 bg-slate-900/30 px-4 py-2 text-sm font-bold">
              Upload File
              <input
                type="file"
                aria-label="Upload file for analysis"
                className="hidden"
                onChange={(e) => analyzeFile(e.target.files?.[0])}
              />
            </label>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-bold">History</div>
          <div className="mt-2 space-y-2 max-h-64 overflow-auto custom-scrollbar">
            {history.slice(0, 15).map((h) => (
              <div key={h.id} className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 text-sm">
                <div className="font-semibold">{h.kind}</div>
                <div className="text-slate-300">{h.summary}</div>
                <div className="mt-1 text-xs text-slate-400">{typeof h.stats === 'string' ? h.stats : JSON.stringify(h.stats)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ViewLayout>
  );
}
