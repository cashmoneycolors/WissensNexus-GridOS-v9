import React, { useEffect, useMemo, useState } from 'react';
import type { SystemMetrics } from '../types';
import ViewLayout from './ViewLayout';
import { Badge, Card, Button } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Props = {
  metrics: SystemMetrics;
};

type TelemetrySummary = {
  windowMinutes: number;
  totalRequests: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  errorRate: number;
  slowRoutes: Array<{ route: string; method: string; hits: number; avgLatencyMs: number }>;
};

type WebhookJob = {
  id: string;
  provider: string;
  event_type: string;
  status: string;
  attempts: number;
  updated_at: number;
};

function formatMoneyCHF(value: number) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 2
  }).format(value);
}

export default function Dashboard({ metrics }: Props) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState(metrics.dailyBudgetCHF.toString());
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [deadLetter, setDeadLetter] = useState<WebhookJob[]>([]);
  const [opsBusy, setOpsBusy] = useState(false);

  useEffect(() => {
    const load = () => {
      apiGet<TelemetrySummary>('/api/telemetry/summary?windowMinutes=60')
        .then(setTelemetry)
        .catch(() => setTelemetry(null));
      apiGet<WebhookJob[]>('/api/webhooks/dead-letter?limit=5')
        .then((rows) => setDeadLetter(Array.isArray(rows) ? rows : []))
        .catch(() => setDeadLetter([]));
    };

    load();
    const i = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 10000);
    return () => clearInterval(i);
  }, []);

  const saveBudget = async () => {
    const val = parseFloat(budgetVal);
    if (!isNaN(val)) {
      await apiSend('/api/settings/budget', 'POST', { amount: val });
      setEditingBudget(false);
      // metrics update comes via interval
    }
  };

  const tone = useMemo(() => {
    if (metrics.load < 45) return 'good' as const;
    if (metrics.load < 75) return 'warn' as const;
    return 'bad' as const;
  }, [metrics.load]);

  const replayJob = async (id: string) => {
    if (!id || opsBusy) return;
    setOpsBusy(true);
    try {
      await apiSend(`/api/webhooks/replay/${id}`, 'POST', {});
      const rows = await apiGet<WebhookJob[]>('/api/webhooks/dead-letter?limit=5');
      setDeadLetter(Array.isArray(rows) ? rows : []);
    } finally {
      setOpsBusy(false);
    }
  };

  const replayAll = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      await apiSend('/api/webhooks/replay_failed', 'POST', {});
      const rows = await apiGet<WebhookJob[]>('/api/webhooks/dead-letter?limit=5');
      setDeadLetter(Array.isArray(rows) ? rows : []);
    } finally {
      setOpsBusy(false);
    }
  };

  return (
    <ViewLayout
      title="Dashboard"
      subtitle="Kompakt, responsive, ohne übergroße Dimensionen."
      right={<Badge tone={tone}>Load {metrics.load.toFixed(0)}%</Badge>}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-400">Global Index</div>
          <div className="mt-1 text-[clamp(1.1rem,3.5vw,1.6rem)] font-black text-slate-100">
            {metrics.globalIndex.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500">Multiplier {metrics.multiplier.toFixed(2)}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-400">Merchant Balance</div>
          <div className="mt-1 text-[clamp(1.1rem,3.5vw,1.6rem)] font-black text-emerald-300">
            {formatMoneyCHF(metrics.merchantBalance)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {editingBudget ? (
              <div className="flex gap-1 items-center">
                <span className="shrink-0 text-[10px] text-slate-400">Set:</span>
                <input 
                  className="w-16 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-xs text-white"
                  value={budgetVal}
                  onChange={(e) => setBudgetVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveBudget();
                  }}
                  aria-label="Daily budget"
                  autoFocus
                />
                <button onClick={saveBudget} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase">OK</button>
              </div>
            ) : (
              <div 
                className="flex gap-2 items-center cursor-pointer group select-none" 
                onClick={() => {
                  setBudgetVal(metrics.dailyBudgetCHF.toString());
                  setEditingBudget(true);
                }}
                title="Click to edit daily budget"
              >
                <span>Daily Budget {formatMoneyCHF(metrics.dailyBudgetCHF)}</span>
                <span className="text-[10px] opacity-0 group-hover:opacity-50 transition-opacity">✎</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-400">Uptime</div>
          <div className="mt-1 text-[clamp(1.1rem,3.5vw,1.6rem)] font-black text-slate-100">
            {Math.floor(metrics.uptime / 60)}m
          </div>
          <div className="mt-2 text-xs text-slate-500">Shards Active {metrics.shardsActive}</div>
        </Card>

        <Card className="p-4 sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-400">Status</div>
              <div className="mt-1 text-sm text-slate-200">
                UI ist mobile-first. Sidebar wird auf kleinen Screens als Drawer geöffnet.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Overflow geschützt</Badge>
              <Badge>Typo via clamp()</Badge>
              <Badge>Lazy Views</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-400">Telemetry (60m)</div>
            <Badge tone={telemetry && telemetry.errorRate > 0.03 ? 'bad' : 'good'}>
              Error {(Number(telemetry?.errorRate || 0) * 100).toFixed(2)}%
            </Badge>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Requests</div>
              <div className="font-bold text-slate-100">{telemetry?.totalRequests ?? 0}</div>
            </div>
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Avg</div>
              <div className="font-bold text-slate-100">{Number(telemetry?.avgLatencyMs || 0).toFixed(1)} ms</div>
            </div>
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Max</div>
              <div className="font-bold text-slate-100">{Number(telemetry?.maxLatencyMs || 0).toFixed(1)} ms</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">Top Slow Routes</div>
          <div className="mt-1 space-y-1 max-h-28 overflow-auto custom-scrollbar">
            {(telemetry?.slowRoutes || []).slice(0, 5).map((r) => (
              <div key={`${r.method}_${r.route}`} className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs">
                <span className="font-semibold text-slate-200">{r.method} {r.route}</span>
                <span className="ml-2 text-slate-400">{r.avgLatencyMs.toFixed(1)} ms ({r.hits})</span>
              </div>
            ))}
            {(telemetry?.slowRoutes || []).length === 0 && <div className="text-xs text-slate-500">Keine Daten.</div>}
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-400">Webhook Dead-Letter</div>
            <Button className="text-xs" onClick={replayAll} disabled={opsBusy || deadLetter.length === 0}>Replay All</Button>
          </div>
          <div className="mt-2 space-y-1 max-h-44 overflow-auto custom-scrollbar">
            {deadLetter.map((j) => (
              <div key={j.id} className="rounded border border-amber-500/20 bg-amber-950/20 p-2 text-xs">
                <div className="font-semibold text-slate-100">{j.provider} · {j.event_type}</div>
                <div className="text-slate-400">Attempts {j.attempts}</div>
                <Button className="mt-1 text-xs" onClick={() => replayJob(j.id)} disabled={opsBusy}>Replay</Button>
              </div>
            ))}
            {deadLetter.length === 0 && <div className="text-xs text-slate-500">Keine fehlgeschlagenen Jobs.</div>}
          </div>
        </Card>
      </div>
    </ViewLayout>
  );
}
