import React, { useEffect, useRef, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Transcript = {
  id: string;
  source: string;
  text: string;
  created_at: number;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

export default function AudioTranscriber() {
  const [list, setList] = useState<Transcript[]>([]);
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    apiGet<Transcript[]>('/api/transcripts').then(setList).catch(() => setList([]));
  }, []);

  const getRecognizer = () => {
    const w = window as any;
    const Ctor: SpeechRecognitionCtor | undefined = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return null;
    return new Ctor();
  };

  const start = () => {
    const rec = getRecognizer();
    if (!rec) {
      alert('SpeechRecognition nicht verfügbar (verwende Chrome/Edge).');
      return;
    }
    rec.lang = 'de-DE';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let out = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        out += e.results[i][0].transcript;
      }
      setText((prev) => (prev + ' ' + out).trim());
    };
    rec.onend = () => setActive(false);
    rec.start();
    recRef.current = rec;
    setActive(true);
  };

  const stop = () => {
    recRef.current?.stop();
    setActive(false);
  };

  const save = async () => {
    if (!text.trim()) return;
    const row = await apiSend<Transcript>('/api/transcripts', 'POST', { text, source: 'speech' });
    setList((prev) => [row, ...prev]);
    setText('');
  };

  return (
    <ViewLayout title="Audio Transcriber" subtitle="Live Speech-to-Text (Browser API) + Persistenz.">
      <div className="grid gap-3 lg:grid-cols-[1fr,360px]">
        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={start} disabled={active}>Start</Button>
            <Button variant="soft" onClick={stop} disabled={!active}>Stop</Button>
            <Button variant="ghost" onClick={save} disabled={!text.trim()}>Save</Button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Transcribed text"
            placeholder="Spracheingabe erscheint hier..."
            className="mt-3 h-40 w-full rounded-xl border border-slate-800/80 bg-black/40 p-3 text-sm"
          />
          <div className="mt-2 text-xs text-slate-500">
            Tipp: Für beste Ergebnisse mit Headset in Chrome/Edge testen.
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-bold">History</div>
          <div className="mt-2 space-y-2 max-h-64 overflow-auto custom-scrollbar">
            {list.slice(0, 15).map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 text-sm">
                <div className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</div>
                <div className="mt-1 text-slate-200">{t.text}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ViewLayout>
  );
}
