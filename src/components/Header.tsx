import React, { useMemo } from 'react';
import type { AppView, SystemMetrics } from '../types';
import { Badge, Button } from './ui';

type Props = {
  currentView: AppView;
  metrics: SystemMetrics;
  onToggleSidebar: () => void;
};

const viewLabel: Record<AppView, string> = {
  DASHBOARD: 'Dashboard',
  AGENT_CONTROL: 'Agent Control',
  EARNING_ENGINE: 'Earning Engine',
  MEMORY_VAULT: 'Memory Vault',
  TOOLBOX: 'Toolbox',
  NEURAL_CHAT: 'Neural Chat',
  COGNITIVE_LAB: 'Cognitive Lab',
  LIVE_VOICE: 'Live Assistant',
  NEURAL_MAP: 'Neural Map',
  MINI_IDE: 'Mini IDE',
  CLOUD_INFRA: 'Cloud Infra',
  TRAINING_CENTER: 'Training Center',
  MISSION_CONTROL: 'Task Matrix',
  PAYPAL_BUSINESS: 'PayPal Business',
  MEDIA_ANALYZER: 'Media Analyzer',
  AUDIO_STT: 'Audio Transcriber',
  MARKET_INSIGHTS: 'Market Insights'
};

export default function Header({ currentView, metrics, onToggleSidebar }: Props) {
  const loadTone = useMemo(() => {
    if (metrics.load < 45) return 'good' as const;
    if (metrics.load < 75) return 'warn' as const;
    return 'bad' as const;
  }, [metrics.load]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/70 bg-black/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="soft"
            className="lg:hidden"
            aria-label="Navigation öffnen"
            onClick={onToggleSidebar}
          >
            Menü
          </Button>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <div className="truncate font-black italic tracking-tight text-emerald-400 text-[clamp(1rem,3.4vw,1.35rem)]">
                GridOS
              </div>
              <div className="truncate text-xs text-slate-400">{viewLabel[currentView]}</div>
            </div>
            <div className="mt-0.5 hidden sm:block text-[11px] text-slate-500">
              Uptime: {Math.floor(metrics.uptime / 60)}m · Multiplier: {metrics.multiplier.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={loadTone}>Load: {metrics.load.toFixed(0)}%</Badge>
          <Badge className="hidden sm:inline-flex">
            CHF: {metrics.merchantBalance.toFixed(2)}
          </Badge>
        </div>
      </div>
    </header>
  );
}
