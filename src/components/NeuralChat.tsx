import React, { useCallback, useEffect, useRef, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Badge, Button, Card } from './ui';
import { apiSend } from '../lib/api';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function NeuralChat() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [backendReady, setBackendReady] = useState<boolean>(true);

  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: uid(),
      role: 'system',
      text: 'Nexus Core Online. Verbunden mit Backend Neural-Engine.'
    }
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMsg[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setBusy(true);

    const userMsg: ChatMsg = { id: uid(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // History für Backend vorbereiten
      const history = messagesRef.current
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      // Backend Call
      const res = await apiSend<{ text: string }>(
        '/api/chat',
        'POST',
        {
          message: text,
          history
        },
        { timeoutMs: 20000, retries: 1 }
      );

      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: res.text }]);
      setBackendReady(true);
    } catch (e: any) {
      console.error(e);
      setBackendReady(false);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          text: `Fehler: ${e.message || 'Verbindung zum Backend fehlgeschlagen'}.`
        }
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, input]);

  return (
    <ViewLayout
      title="Neural Chat"
      subtitle="Mobile-first Chat UI. Backend Proxy (Gemini)."
      right={
        <Badge tone={backendReady ? 'good' : 'bad'}>
          {busy ? 'Thinking...' : backendReady ? 'Online' : 'Offline'}
        </Badge>
      }
    >
      <Card className="p-3 sm:p-4">
        <div
          ref={listRef}
          className="custom-scrollbar h-[min(55dvh,520px)] overflow-y-auto rounded-xl border border-slate-800/80 bg-black/30 p-3"
        >
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  'max-w-[92%] rounded-2xl border px-3 py-2 text-sm leading-relaxed ' +
                  (m.role === 'user'
                    ? 'ml-auto border-emerald-500/30 bg-emerald-950/20 text-slate-100'
                    : m.role === 'system'
                      ? 'mx-auto border-slate-800/80 bg-slate-950/20 text-slate-300'
                      : 'mr-auto border-slate-800/80 bg-slate-950/30 text-slate-100')
                }
              >
                <div className="text-[11px] font-bold opacity-80">
                  {m.role === 'user' ? 'YOU' : m.role === 'assistant' ? 'NEXUS' : 'SYSTEM'}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Schreibe eine Nachricht…"
            className="w-full flex-1 rounded-full border border-slate-800/80 bg-black/40 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/40"
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="w-auto"
              disabled={busy}
              onClick={() => {
                setMessages((prev) => prev.slice(0, 1));
                setBackendReady(true);
              }}
            >
              Reset
            </Button>
            <Button className="w-full sm:w-auto" disabled={busy} onClick={() => void send()}>
              {busy ? 'Nexus denkt…' : 'Senden'}
            </Button>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Nexus v9 Core Online. Alle Anfragen laufen über das Backend.
        </div>
      </Card>
    </ViewLayout>
  );
}
