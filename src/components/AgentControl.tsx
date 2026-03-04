import React, { useEffect, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Badge, Button, Card } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Settings = {
  id: string;
  mode: string;
  throttle: number;
  auto_fix: number;
};

export default function AgentControl() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Settings>('/api/agent/settings').then(setSettings).catch(() => setSettings(null));
  }, []);

  const update = async (patch: Partial<Settings>) => {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const next = await apiSend<Settings>('/api/agent/settings', 'PUT', {
        mode: patch.mode ?? settings.mode,
        throttle: patch.throttle ?? settings.throttle,
        auto_fix: patch.auto_fix ?? settings.auto_fix
      });
      setSettings(next);
    } finally {
      setSaving(false);
    }
  };

  const [autonomyOn, setAutonomyOn] = useState(false);
  const toggleAutonomy = async () => {
    const res = await apiSend<{status: string}>('/api/agent/toggle_autonomy', 'POST');
    setAutonomyOn(res.status === 'Startet');
  };

  return (
    <ViewLayout title="Agent & Autonomy Control" subtitle="Backend-Loop Kontrolle.">
      <Card className="p-4 space-y-4 mb-4 border-emerald-500/30 bg-emerald-950/20">
         <div className="font-bold text-lg text-emerald-300">Autonomer Worker-Loop</div>
         <p className="text-xs text-emerald-100/70">
           Wenn <strong>AKTIV</strong>, führt der Server alle 15s einen Task aus oder generiert Value-Content 
           im Order <code>output_content/</code>. <br/>
           (Verbraucht echte API-Credits!)
         </p>
         <Button onClick={toggleAutonomy} variant={autonomyOn ? 'soft' : 'solid'} className={autonomyOn ? 'border-red-500 text-red-300' : ''}>
           {autonomyOn ? 'STOP AUTONOMY' : 'START AUTONOMOUS WORKER'}
         </Button>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={settings?.auto_fix ? 'good' : 'warn'}>
            Auto-Fix: {settings?.auto_fix ? 'On' : 'Off'}
          </Badge>
          <Badge>Mode: {settings?.mode ?? '—'}</Badge>
          <Badge>Throttle: {settings?.throttle ?? 0}%</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-400">Modus</div>
            <select
              value={settings?.mode ?? 'balanced'}
              onChange={(e) => update({ mode: e.target.value })}
              aria-label="Agent mode"
              className="mt-1 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
            >
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
              <option value="safe">Safe</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-400">Throttle</div>
            <input
              type="range"
              min={10}
              max={100}
              value={settings?.throttle ?? 50}
              onChange={(e) => update({ throttle: Number(e.target.value) })}
              aria-label="Throttle"
              className="mt-2 w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={settings?.auto_fix ? 'soft' : 'solid'}
            onClick={() => update({ auto_fix: settings?.auto_fix ? 0 : 1 })}
          >
            Auto-Fix {settings?.auto_fix ? 'deaktivieren' : 'aktivieren'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => update({ mode: 'balanced', throttle: 70, auto_fix: 1 })}
          >
            Reset to Balanced
          </Button>
        </div>
      </Card>
    </ViewLayout>
  );
}
