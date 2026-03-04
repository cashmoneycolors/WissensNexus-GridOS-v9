import React, { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Card, Button } from './ui';

export default function MiniIDE() {
  const [code, setCode] = useState('// Mini IDE (Browser JS)\nconst x = 10;\nconst y = 20;\nx * y;');
  const [output, setOutput] = useState('');

  const runCode = () => {
    try {
      // Security warning: This is a client-side eval.
      // eslint-disable-next-line no-new-func
      const result = new Function(code)();
      setOutput(String(result));
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
  };

  return (
    <ViewLayout title="Mini IDE" subtitle="Client-seitige JS-Ausführung.">
      <div className="grid gap-3 lg:grid-cols-2">
      <Card className="p-3">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="JavaScript code"
          placeholder="Schreibe deinen JavaScript-Code hier..."
          className="custom-scrollbar h-[min(55dvh,400px)] w-full resize-none rounded-xl border border-slate-800/80 bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-emerald-500/40"
          spellCheck={false}
        />
        <Button onClick={runCode} className="mt-2">Run JS</Button>
      </Card>
      <Card className="p-3 bg-black/60 font-mono text-sm text-green-400">
        <div className="text-xs text-slate-500 mb-2">OUTPUT</div>
        {output}
      </Card>
      </div>
    </ViewLayout>
  );
}
