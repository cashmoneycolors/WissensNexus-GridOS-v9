import React, { useRef, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card } from './ui';
import { apiSend } from '../lib/api';

type SpeechRecognitionCtor = new () => SpeechRecognition;

export default function LiveAssistant() {
  const [active, setActive] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const recRef = useRef<SpeechRecognition | null>(null);

  const getRecognizer = () => {
    const w = window as any;
    const Ctor: SpeechRecognitionCtor | undefined = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return null;
    return new Ctor();
  };

  const parseAndExecute = async (text: string) => {
    const t = text.toLowerCase();
    if (t.startsWith('task ')) {
      const title = text.slice(5).trim();
      if (title) await apiSend('/api/tasks', 'POST', { title, priority: 2 });
      return `Task erstellt: ${title}`;
    }
    if (t.startsWith('note ')) {
      const title = text.slice(5).trim();
      if (title) await apiSend('/api/notes', 'POST', { title, body: '', tags: 'voice' });
      return `Note erstellt: ${title}`;
    }
    return 'Befehl nicht erkannt. Nutze "task ..." oder "note ...".';
  };

  const start = () => {
    const rec = getRecognizer();
    if (!rec) {
      alert('SpeechRecognition nicht verfügbar (Chrome/Edge).');
      return;
    }
    rec.lang = 'de-DE';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const text = e.results[e.results.length - 1][0].transcript.trim();
      setLog((prev) => [`🎙 ${text}`, ...prev]);
      const out = await parseAndExecute(text);
      setLog((prev) => [`✅ ${out}`, ...prev]);
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

  return (
    <ViewLayout title="Live Assistant" subtitle="Voice Commands → echte Aktionen.">
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={start} disabled={active}>Start Listening</Button>
          <Button variant="soft" onClick={stop} disabled={!active}>Stop</Button>
        </div>
        <div className="mt-3 text-xs text-slate-400">Beispiele: “task Fix Build”, “note UI Review”.</div>
        <div className="mt-3 max-h-60 overflow-auto custom-scrollbar space-y-2">
          {log.map((l, i) => (
            <div key={i} className="rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-sm">
              {l}
            </div>
          ))}
        </div>
      </Card>
    </ViewLayout>
  );
}
