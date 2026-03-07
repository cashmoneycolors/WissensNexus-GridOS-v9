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

type BackpressureSnapshot = {
  snapshot?: {
    workerUtilization: number;
    webhookUtilization: number;
    pendingJobs: number;
    failedJobs: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
    createdAt: number;
  };
  worker: {
    busy: boolean;
    runs: number;
    skipped: number;
    lastDurationMs: number;
    lastAt: number;
    intervalMs: number;
  };
  webhookProcessor: {
    busy: boolean;
    runs: number;
    skipped: number;
    lastDurationMs: number;
    lastAt: number;
    intervalMs: number;
    batchSize: number;
    pendingJobs: number;
    failedJobs: number;
  };
  replayPolicy: {
    baseDelayMs: number;
    maxDelayMs: number;
    batchSize: number;
  };
  opsThresholds?: OpsThresholds;
  opsThresholdsStatic?: OpsThresholds;
  opsThresholdMode?: 'fixed' | 'adaptive';
  opsAdaptive?: OpsAdaptiveSettings;
  opsPlaybooks?: OpsPlaybookSettings;
  anomaly?: AnomalyState;
};

type OpsHistoryRow = {
  id: string;
  worker_utilization: number;
  webhook_utilization: number;
  pending_jobs: number;
  failed_jobs: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate: number;
  created_at: number;
};

type OpsAlertRow = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: number;
  created_at: number;
};

type OpsThresholds = {
  pendingJobs: number;
  failedJobs: number;
  p95LatencyMs: number;
  errorRate: number;
};

type ReplayRateLimit = {
  perMinute: number;
  persistentEnabled: boolean;
  counterRetentionMinutes: number;
  usage?: {
    minuteBucket: number;
    provider: string;
    eventType: string;
    hits: number;
  };
  remaining?: number;
};

type OpsAdaptiveSettings = {
  enabled: boolean;
  lookbackSnapshots: number;
  sensitivity: number;
  minBaselineSamples: number;
};

type OpsPlaybookSettings = {
  enabled: boolean;
  criticalOnly: boolean;
  allowOnAnomaly: boolean;
  queueBatchReductionPct: number;
  latencyBackoffFloorMs: number;
  anomalyReplayPauseMs: number;
  maxActionsPerHour: number;
  actionCooldownMs: number;
  autoRollbackMs: number;
  rollbackOnStabilized: boolean;
};

type OpsPlaybookActionRow = {
  id: string;
  alert_kind: string;
  severity: string;
  action_name: string;
  status: string;
  reason: string;
  rollback_reason: string;
  created_at: number;
  rolled_back_at?: number | null;
};

type AnomalyState = {
  detected: boolean;
  severity?: string;
  maxZ?: number;
};

type DailyReport = {
  date: string;
  summary: {
    snapshots: number;
    avgWorkerUtilization: number;
    avgWebhookUtilization: number;
    maxPendingJobs: number;
    maxFailedJobs: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
    alertsCount: number;
  };
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
  const [ops, setOps] = useState<BackpressureSnapshot | null>(null);
  const [opsHistory, setOpsHistory] = useState<OpsHistoryRow[]>([]);
  const [opsAlerts, setOpsAlerts] = useState<OpsAlertRow[]>([]);
  const [opsThresholds, setOpsThresholds] = useState<OpsThresholds>({ pendingJobs: 60, failedJobs: 5, p95LatencyMs: 700, errorRate: 0.05 });
  const [opsThresholdMode, setOpsThresholdMode] = useState<'fixed' | 'adaptive'>('fixed');
  const [opsAdaptive, setOpsAdaptive] = useState<OpsAdaptiveSettings>({ enabled: true, lookbackSnapshots: 60, sensitivity: 2.2, minBaselineSamples: 20 });
  const [opsPlaybooks, setOpsPlaybooks] = useState<OpsPlaybookSettings>({ enabled: true, criticalOnly: true, allowOnAnomaly: true, queueBatchReductionPct: 0.35, latencyBackoffFloorMs: 10000, anomalyReplayPauseMs: 30000, maxActionsPerHour: 8, actionCooldownMs: 300000, autoRollbackMs: 900000, rollbackOnStabilized: true });
  const [replayRateLimit, setReplayRateLimit] = useState<ReplayRateLimit>({ perMinute: 30, persistentEnabled: true, counterRetentionMinutes: 180 });
  const [playbookActions, setPlaybookActions] = useState<OpsPlaybookActionRow[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [reportDate, setReportDate] = useState('');
  const [lastExportInfo, setLastExportInfo] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [replayStrategy, setReplayStrategy] = useState<'reset' | 'preserve' | 'backoff'>('backoff');
  const [replayBatchSize, setReplayBatchSize] = useState(20);
  const [opsBusy, setOpsBusy] = useState(false);

  useEffect(() => {
    const load = () => {
      const params = new URLSearchParams();
      params.set('limit', '8');
      if (providerFilter.trim()) params.set('provider', providerFilter.trim());
      if (eventFilter.trim()) params.set('eventType', eventFilter.trim());

      apiGet<TelemetrySummary>('/api/telemetry/summary?windowMinutes=60')
        .then(setTelemetry)
        .catch(() => setTelemetry(null));
      apiGet<WebhookJob[]>(`/api/webhooks/dead-letter?${params.toString()}`)
        .then((rows) => setDeadLetter(Array.isArray(rows) ? rows : []))
        .catch(() => setDeadLetter([]));
      apiGet<BackpressureSnapshot>('/api/ops/backpressure')
        .then((bp) => {
          setOps(bp);
          if (bp?.opsThresholds) setOpsThresholds(bp.opsThresholds);
          if (bp?.opsThresholdMode) setOpsThresholdMode(bp.opsThresholdMode);
          if (bp?.opsAdaptive) setOpsAdaptive(bp.opsAdaptive);
          if (bp?.opsPlaybooks) setOpsPlaybooks(bp.opsPlaybooks);
          if (bp?.replayPolicy?.batchSize && !Number.isFinite(replayBatchSize)) {
            setReplayBatchSize(bp.replayPolicy.batchSize);
          }
        })
        .catch(() => setOps(null));
      apiGet<OpsHistoryRow[]>('/api/ops/history?limit=36')
        .then((rows) => setOpsHistory(Array.isArray(rows) ? rows : []))
        .catch(() => setOpsHistory([]));
      apiGet<OpsAlertRow[]>('/api/ops/alerts?onlyOpen=true&limit=8')
        .then((rows) => setOpsAlerts(Array.isArray(rows) ? rows : []))
        .catch(() => setOpsAlerts([]));
      apiGet<ReplayRateLimit>('/api/webhooks/replay_rate_limit')
        .then(setReplayRateLimit)
        .catch(() => setReplayRateLimit({ perMinute: 30, persistentEnabled: true, counterRetentionMinutes: 180 }));
      apiGet<OpsPlaybookActionRow[]>('/api/ops/playbooks/actions?limit=10')
        .then((rows) => setPlaybookActions(Array.isArray(rows) ? rows : []))
        .catch(() => setPlaybookActions([]));
      apiGet<DailyReport>(`/api/ops/report/daily${reportDate ? `?date=${encodeURIComponent(reportDate)}` : ''}`)
        .then(setDailyReport)
        .catch(() => setDailyReport(null));
    };

    load();
    const i = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 5000);
    return () => clearInterval(i);
  }, [providerFilter, eventFilter, replayBatchSize, reportDate]);

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
      await apiSend(`/api/webhooks/replay/${id}`, 'POST', { strategy: replayStrategy });
      const rows = await apiGet<WebhookJob[]>(`/api/webhooks/dead-letter?limit=8&provider=${encodeURIComponent(providerFilter)}&eventType=${encodeURIComponent(eventFilter)}`);
      setDeadLetter(Array.isArray(rows) ? rows : []);
      const bp = await apiGet<BackpressureSnapshot>('/api/ops/backpressure');
      setOps(bp);
    } finally {
      setOpsBusy(false);
    }
  };

  const replayAll = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      await apiSend('/api/webhooks/replay_failed', 'POST', {
        provider: providerFilter || undefined,
        eventType: eventFilter || undefined,
        strategy: replayStrategy,
        batchSize: Number.isFinite(replayBatchSize) ? replayBatchSize : 20
      });
      const rows = await apiGet<WebhookJob[]>(`/api/webhooks/dead-letter?limit=8&provider=${encodeURIComponent(providerFilter)}&eventType=${encodeURIComponent(eventFilter)}`);
      setDeadLetter(Array.isArray(rows) ? rows : []);
      const bp = await apiGet<BackpressureSnapshot>('/api/ops/backpressure');
      setOps(bp);
    } finally {
      setOpsBusy(false);
    }
  };

  const runOpsMonitorNow = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      await apiSend('/api/ops/monitor/run', 'POST', {});
      const [bp, history, alerts] = await Promise.all([
        apiGet<BackpressureSnapshot>('/api/ops/backpressure'),
        apiGet<OpsHistoryRow[]>('/api/ops/history?limit=36'),
        apiGet<OpsAlertRow[]>('/api/ops/alerts?onlyOpen=true&limit=8')
      ]);
      setOps(bp);
      setOpsHistory(Array.isArray(history) ? history : []);
      setOpsAlerts(Array.isArray(alerts) ? alerts : []);
    } finally {
      setOpsBusy(false);
    }
  };

  const ackOpsAlerts = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      await apiSend('/api/ops/alerts/ack_all', 'POST', {});
      const alerts = await apiGet<OpsAlertRow[]>('/api/ops/alerts?onlyOpen=true&limit=8');
      setOpsAlerts(Array.isArray(alerts) ? alerts : []);
    } finally {
      setOpsBusy(false);
    }
  };

  const saveOpsThresholds = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      const next = await apiSend<OpsThresholds>('/api/ops/thresholds', 'PUT', opsThresholds);
      setOpsThresholds(next);
    } finally {
      setOpsBusy(false);
    }
  };

  const saveReplayRateLimit = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      const next = await apiSend<ReplayRateLimit>('/api/webhooks/replay_rate_limit', 'PUT', replayRateLimit);
      setReplayRateLimit(next);
    } finally {
      setOpsBusy(false);
    }
  };

  const saveOpsAdaptive = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      const next = await apiSend<OpsAdaptiveSettings>('/api/ops/adaptive', 'PUT', opsAdaptive);
      setOpsAdaptive(next);
      const bp = await apiGet<BackpressureSnapshot>('/api/ops/backpressure');
      setOps(bp);
      if (bp?.opsThresholds) setOpsThresholds(bp.opsThresholds);
      if (bp?.opsThresholdMode) setOpsThresholdMode(bp.opsThresholdMode);
    } finally {
      setOpsBusy(false);
    }
  };

  const saveOpsPlaybooks = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      const next = await apiSend<OpsPlaybookSettings>('/api/ops/playbooks', 'PUT', opsPlaybooks);
      setOpsPlaybooks(next);
      const rows = await apiGet<OpsPlaybookActionRow[]>('/api/ops/playbooks/actions?limit=10');
      setPlaybookActions(Array.isArray(rows) ? rows : []);
    } finally {
      setOpsBusy(false);
    }
  };

  const runPlaybookRollback = async () => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      await apiSend('/api/ops/playbooks/rollback_run', 'POST', {});
      const rows = await apiGet<OpsPlaybookActionRow[]>('/api/ops/playbooks/actions?limit=10');
      setPlaybookActions(Array.isArray(rows) ? rows : []);
    } finally {
      setOpsBusy(false);
    }
  };

  const exportDailyReport = async (format: 'json' | 'csv') => {
    if (opsBusy) return;
    setOpsBusy(true);
    try {
      const result = await apiSend<{ fileName: string; bytes: number }>('/api/ops/report/daily/export', 'POST', {
        date: reportDate || undefined,
        format
      });
      setLastExportInfo(`${result.fileName} (${result.bytes} bytes)`);
      const report = await apiGet<DailyReport>(`/api/ops/report/daily${reportDate ? `?date=${encodeURIComponent(reportDate)}` : ''}`);
      setDailyReport(report);
    } finally {
      setOpsBusy(false);
    }
  };

  const workerUtil = ops ? Math.min(100, Math.round((Number(ops.worker.lastDurationMs || 0) / Math.max(1, Number(ops.worker.intervalMs || 1))) * 100)) : 0;
  const webhookUtil = ops ? Math.min(100, Math.round((Number(ops.webhookProcessor.lastDurationMs || 0) / Math.max(1, Number(ops.webhookProcessor.intervalMs || 1))) * 100)) : 0;

  const heatTone = (v: number) => (v >= 80 ? 'bg-rose-500' : v >= 50 ? 'bg-amber-500' : 'bg-emerald-500');

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
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              placeholder="provider"
              aria-label="Dead letter provider filter"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
            <input
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              placeholder="event_type"
              aria-label="Dead letter event type filter"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
            <select
              value={replayStrategy}
              onChange={(e) => setReplayStrategy(e.target.value as 'reset' | 'preserve' | 'backoff')}
              aria-label="Replay strategy"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            >
              <option value="backoff">backoff</option>
              <option value="reset">reset</option>
              <option value="preserve">preserve</option>
            </select>
            <input
              type="number"
              min={1}
              max={500}
              value={replayBatchSize}
              onChange={(e) => setReplayBatchSize(Number(e.target.value || 20))}
              aria-label="Replay batch size"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
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

        <Card className="p-4 sm:col-span-2 lg:col-span-3">
          <div className="text-xs font-semibold text-slate-400">Ops Backpressure Heat Panel</div>
          <div className="mt-1 text-xs text-slate-500">
            Threshold Mode: <span className="font-semibold text-slate-300">{opsThresholdMode}</span>
            {ops?.anomaly?.detected ? (
              <span className="ml-2 rounded border border-rose-500/40 bg-rose-950/20 px-1.5 py-0.5 text-rose-300">
                anomaly z={Number(ops.anomaly.maxZ || 0).toFixed(2)}
              </span>
            ) : (
              <span className="ml-2 rounded border border-emerald-500/30 bg-emerald-950/20 px-1.5 py-0.5 text-emerald-300">stable</span>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Worker Utilization</span>
                <span className="text-slate-400">{workerUtil}%</span>
              </div>
              <div className="mt-2 h-2 rounded bg-slate-900/80 overflow-hidden">
                <progress
                  className={`h-full w-full ${heatTone(workerUtil)}`}
                  value={workerUtil}
                  max={100}
                  aria-label="Worker utilization"
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                runs {ops?.worker.runs ?? 0} · skipped {ops?.worker.skipped ?? 0} · interval {ops?.worker.intervalMs ?? 0}ms
              </div>
            </div>

            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Webhook Processor Utilization</span>
                <span className="text-slate-400">{webhookUtil}%</span>
              </div>
              <div className="mt-2 h-2 rounded bg-slate-900/80 overflow-hidden">
                <progress
                  className={`h-full w-full ${heatTone(webhookUtil)}`}
                  value={webhookUtil}
                  max={100}
                  aria-label="Webhook processor utilization"
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                pending {ops?.webhookProcessor.pendingJobs ?? 0} · failed {ops?.webhookProcessor.failedJobs ?? 0} · batch {ops?.webhookProcessor.batchSize ?? 0}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Replay Policy: base {ops?.replayPolicy.baseDelayMs ?? 0}ms · max {ops?.replayPolicy.maxDelayMs ?? 0}ms · batch {ops?.replayPolicy.batchSize ?? 0}
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-400">Ops History (Persistiert)</div>
            <Button className="text-xs" onClick={runOpsMonitorNow} disabled={opsBusy}>Run Monitor Now</Button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">p95 Latest</div>
              <div className="font-bold text-slate-100">{Number(ops?.snapshot?.p95LatencyMs || 0).toFixed(1)} ms</div>
            </div>
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Queue Pending</div>
              <div className="font-bold text-slate-100">{ops?.snapshot?.pendingJobs ?? 0}</div>
            </div>
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Error Rate</div>
              <div className="font-bold text-slate-100">{(Number(ops?.snapshot?.errorRate || 0) * 100).toFixed(2)}%</div>
            </div>
          </div>
          <div className="mt-2 max-h-28 overflow-auto custom-scrollbar space-y-1">
            {opsHistory.slice(0, 10).map((row) => (
              <div key={row.id} className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs text-slate-300">
                {new Date(row.created_at).toLocaleTimeString()} · p95 {Number(row.p95_latency_ms).toFixed(0)}ms · err {(Number(row.error_rate) * 100).toFixed(2)}% · q {row.pending_jobs}/{row.failed_jobs}
              </div>
            ))}
            {opsHistory.length === 0 && <div className="text-xs text-slate-500">Noch keine History-Eintraege.</div>}
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-400">Ops Auto-Alerts</div>
            <Button className="text-xs" onClick={ackOpsAlerts} disabled={opsBusy || opsAlerts.length === 0}>Ack All</Button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="number"
              value={opsThresholds.pendingJobs}
              onChange={(e) => setOpsThresholds((p) => ({ ...p, pendingJobs: Number(e.target.value || 0) }))}
              aria-label="Pending jobs threshold"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
            <input
              type="number"
              value={opsThresholds.failedJobs}
              onChange={(e) => setOpsThresholds((p) => ({ ...p, failedJobs: Number(e.target.value || 0) }))}
              aria-label="Failed jobs threshold"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
            <input
              type="number"
              value={opsThresholds.p95LatencyMs}
              onChange={(e) => setOpsThresholds((p) => ({ ...p, p95LatencyMs: Number(e.target.value || 0) }))}
              aria-label="p95 latency threshold"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
            <input
              type="number"
              step="0.001"
              value={opsThresholds.errorRate}
              onChange={(e) => setOpsThresholds((p) => ({ ...p, errorRate: Number(e.target.value || 0) }))}
              aria-label="Error rate threshold"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
          </div>
          <Button className="mt-2 text-xs" onClick={saveOpsThresholds} disabled={opsBusy}>Save Thresholds</Button>
          <div className="mt-2 max-h-24 overflow-auto custom-scrollbar space-y-1">
            {opsAlerts.map((a) => (
              <div key={a.id} className="rounded border border-rose-500/20 bg-rose-950/20 px-2 py-1 text-xs">
                <div className="font-semibold text-slate-100">{a.title}</div>
                <div className="text-slate-300">{a.message}</div>
              </div>
            ))}
            {opsAlerts.length === 0 && <div className="text-xs text-slate-500">Keine offenen Ops-Alerts.</div>}
          </div>
          <div className="mt-3 rounded border border-slate-800/80 bg-slate-950/30 p-2">
            <div className="text-[11px] text-slate-400">Replay Rate Limit / min</div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <input
                type="number"
                min={1}
                max={5000}
                value={replayRateLimit.perMinute}
                onChange={(e) => setReplayRateLimit((p) => ({ ...p, perMinute: Number(e.target.value || 1) }))}
                aria-label="Replay rate limit per minute"
                className="w-24 rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
              />
              <input
                type="number"
                min={10}
                max={1440}
                value={replayRateLimit.counterRetentionMinutes}
                onChange={(e) => setReplayRateLimit((p) => ({ ...p, counterRetentionMinutes: Number(e.target.value || 180) }))}
                aria-label="Replay counter retention minutes"
                className="w-24 rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
              />
              <label className="flex items-center gap-1 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={replayRateLimit.persistentEnabled}
                  onChange={(e) => setReplayRateLimit((p) => ({ ...p, persistentEnabled: e.target.checked }))}
                />
                persistent
              </label>
              <Button className="text-xs" onClick={saveReplayRateLimit} disabled={opsBusy}>Save</Button>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              usage {replayRateLimit.usage?.hits ?? 0}/{replayRateLimit.perMinute} · remaining {replayRateLimit.remaining ?? Math.max(0, replayRateLimit.perMinute - Number(replayRateLimit.usage?.hits || 0))}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-400">Daily Ops Report</div>
            <div className="flex gap-2">
              <Button className="text-xs" onClick={() => exportDailyReport('json')} disabled={opsBusy}>Export JSON</Button>
              <Button className="text-xs" onClick={() => exportDailyReport('csv')} disabled={opsBusy}>Export CSV</Button>
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[180px,1fr]">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              aria-label="Report date"
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-xs"
            />
            <div className="text-xs text-slate-500">
              {lastExportInfo ? `Letzter Export: ${lastExportInfo}` : 'Kein Export in dieser Session.'}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Snapshots</div>
              <div className="font-bold text-slate-100">{dailyReport?.summary.snapshots ?? 0}</div>
            </div>
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">p95</div>
              <div className="font-bold text-slate-100">{Number(dailyReport?.summary.p95LatencyMs || 0).toFixed(1)} ms</div>
            </div>
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Err Rate</div>
              <div className="font-bold text-slate-100">{(Number(dailyReport?.summary.errorRate || 0) * 100).toFixed(2)}%</div>
            </div>
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-2">
              <div className="text-slate-500">Ops Alerts</div>
              <div className="font-bold text-slate-100">{dailyReport?.summary.alertsCount ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 lg:col-span-3">
          <div className="text-xs font-semibold text-slate-400">Stage 11: Adaptive Ops + Playbooks</div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-300">Adaptive Thresholds</div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={opsAdaptive.enabled}
                    onChange={(e) => setOpsAdaptive((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  enabled
                </label>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <input
                  type="number"
                  min={20}
                  max={500}
                  value={opsAdaptive.lookbackSnapshots}
                  onChange={(e) => setOpsAdaptive((p) => ({ ...p, lookbackSnapshots: Number(e.target.value || 60) }))}
                  aria-label="Adaptive lookback snapshots"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
                <input
                  type="number"
                  step="0.1"
                  min={1.2}
                  max={4}
                  value={opsAdaptive.sensitivity}
                  onChange={(e) => setOpsAdaptive((p) => ({ ...p, sensitivity: Number(e.target.value || 2.2) }))}
                  aria-label="Adaptive sensitivity"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
                <input
                  type="number"
                  min={10}
                  max={80}
                  value={opsAdaptive.minBaselineSamples}
                  onChange={(e) => setOpsAdaptive((p) => ({ ...p, minBaselineSamples: Number(e.target.value || 20) }))}
                  aria-label="Adaptive minimum baseline samples"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
              </div>
              <Button className="mt-2 text-xs" onClick={saveOpsAdaptive} disabled={opsBusy}>Save Adaptive</Button>
            </div>

            <div className="rounded border border-slate-800/80 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-300">Auto-Remediation Playbooks</div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={opsPlaybooks.enabled}
                    onChange={(e) => setOpsPlaybooks((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  enabled
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opsPlaybooks.criticalOnly}
                    onChange={(e) => setOpsPlaybooks((p) => ({ ...p, criticalOnly: e.target.checked }))}
                  />
                  critical only
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opsPlaybooks.allowOnAnomaly}
                    onChange={(e) => setOpsPlaybooks((p) => ({ ...p, allowOnAnomaly: e.target.checked }))}
                  />
                  anomaly actions
                </label>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <input
                  type="number"
                  step="0.01"
                  min={0.1}
                  max={0.8}
                  value={opsPlaybooks.queueBatchReductionPct}
                  onChange={(e) => setOpsPlaybooks((p) => ({ ...p, queueBatchReductionPct: Number(e.target.value || 0.35) }))}
                  aria-label="Queue batch reduction percent"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
                <input
                  type="number"
                  min={2000}
                  max={120000}
                  value={opsPlaybooks.latencyBackoffFloorMs}
                  onChange={(e) => setOpsPlaybooks((p) => ({ ...p, latencyBackoffFloorMs: Number(e.target.value || 10000) }))}
                  aria-label="Latency backoff floor ms"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
                <input
                  type="number"
                  min={5000}
                  max={600000}
                  value={opsPlaybooks.anomalyReplayPauseMs}
                  onChange={(e) => setOpsPlaybooks((p) => ({ ...p, anomalyReplayPauseMs: Number(e.target.value || 30000) }))}
                  aria-label="Anomaly replay pause ms"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={opsPlaybooks.maxActionsPerHour}
                  onChange={(e) => setOpsPlaybooks((p) => ({ ...p, maxActionsPerHour: Number(e.target.value || 8) }))}
                  aria-label="Max playbook actions per hour"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
                <input
                  type="number"
                  min={30000}
                  max={3600000}
                  value={opsPlaybooks.actionCooldownMs}
                  onChange={(e) => setOpsPlaybooks((p) => ({ ...p, actionCooldownMs: Number(e.target.value || 300000) }))}
                  aria-label="Playbook action cooldown ms"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
                <input
                  type="number"
                  min={60000}
                  max={7200000}
                  value={opsPlaybooks.autoRollbackMs}
                  onChange={(e) => setOpsPlaybooks((p) => ({ ...p, autoRollbackMs: Number(e.target.value || 900000) }))}
                  aria-label="Playbook auto rollback ms"
                  className="rounded border border-slate-800/80 bg-black/30 px-2 py-1"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={opsPlaybooks.rollbackOnStabilized}
                    onChange={(e) => setOpsPlaybooks((p) => ({ ...p, rollbackOnStabilized: e.target.checked }))}
                  />
                  rollback on stabilized
                </label>
              </div>
              <div className="mt-2 flex gap-2">
                <Button className="text-xs" onClick={saveOpsPlaybooks} disabled={opsBusy}>Save Playbooks</Button>
                <Button className="text-xs" onClick={runPlaybookRollback} disabled={opsBusy}>Run Rollback Guard</Button>
              </div>
              <div className="mt-2 max-h-24 overflow-auto custom-scrollbar space-y-1">
                {playbookActions.map((a) => (
                  <div key={a.id} className="rounded border border-slate-800/80 bg-black/30 px-2 py-1 text-[11px] text-slate-300">
                    {new Date(a.created_at).toLocaleTimeString()} · {a.action_name} · {a.status}
                  </div>
                ))}
                {playbookActions.length === 0 && <div className="text-[11px] text-slate-500">Noch keine Playbook-Aktionen.</div>}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </ViewLayout>
  );
}
