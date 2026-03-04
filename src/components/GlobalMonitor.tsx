import React from 'react';
import type { SystemMetrics } from '../types';
import { Card, Badge } from './ui';

type Props = {
  metrics: SystemMetrics;
};

export default function GlobalMonitor({ metrics }: Props) {
  const tone = metrics.load < 60 ? 'good' : metrics.load < 85 ? 'warn' : 'bad';

  return (
    <Card className="px-3 py-2 shadow-[0_0_50px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2">
        <Badge tone={tone}>Load {metrics.load.toFixed(0)}%</Badge>
        <div className="text-xs text-slate-400">Uptime {Math.floor(metrics.uptime / 60)}m</div>
      </div>
    </Card>
  );
}
