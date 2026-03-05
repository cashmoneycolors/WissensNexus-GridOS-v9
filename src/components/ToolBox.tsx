import React, { useMemo, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card } from './ui';

export default function ToolBox() {
  const [jsonInput, setJsonInput] = useState(`{
  "hello": "world",
  "value": 42
}`);
  const [base64Input, setBase64Input] = useState('GridOS');

  const jsonPretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(jsonInput), null, 2);
    } catch {
      return '⚠️ Invalid JSON';
    }
  }, [jsonInput]);

  const b64 = useMemo(() => {
    try {
      return btoa(unescape(encodeURIComponent(base64Input)));
    } catch {
      return '⚠️ Encode error';
    }
  }, [base64Input]);

  const decoded = useMemo(() => {
    try {
      return decodeURIComponent(escape(atob(base64Input)));
    } catch {
      return '⚠️ Decode error';
    }
  }, [base64Input]);

  return (
    <ViewLayout title="Toolbox" subtitle="Echte Utilities für Entwickler-Workflows.">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm font-bold">JSON Formatter</div>
          <label htmlFor="toolbox-json-input" className="mt-2 block text-xs text-slate-400">JSON Input</label>
          <textarea
            id="toolbox-json-input"
            aria-label="JSON input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="mt-2 h-40 w-full rounded-xl border border-slate-800/80 bg-black/40 p-3 text-xs font-mono"
          />
          <div className="mt-2 text-xs text-slate-400">Preview</div>
          <pre className="custom-scrollbar mt-1 max-h-40 overflow-auto rounded-xl border border-slate-800/80 bg-black/40 p-3 text-xs">
            {jsonPretty}
          </pre>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-bold">Base64 Encode/Decode</div>
          <label htmlFor="toolbox-base64-input" className="mt-2 block text-xs text-slate-400">Text/Input</label>
          <input
            id="toolbox-base64-input"
            aria-label="Base64 source input"
            value={base64Input}
            onChange={(e) => setBase64Input(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <div className="mt-2 text-xs text-slate-400">Encoded</div>
          <div className="mt-1 break-all rounded-xl border border-slate-800/80 bg-black/40 p-2 text-xs">
            {b64}
          </div>
          <div className="mt-2 text-xs text-slate-400">Decoded</div>
          <div className="mt-1 break-all rounded-xl border border-slate-800/80 bg-black/40 p-2 text-xs">
            {decoded}
          </div>
          <Button className="mt-3" onClick={() => setBase64Input(b64)}>Use Encoded</Button>
        </Card>
      </div>
    </ViewLayout>
  );
}
