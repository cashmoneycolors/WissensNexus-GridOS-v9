import React, { useMemo, useState } from 'react';
import type { SystemMetrics } from '../types';
import ViewLayout from './ViewLayout';
import { Badge, Card, Button } from './ui';
import { apiSend } from '../lib/api';

type Props = {
  metrics: SystemMetrics;
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
      </div>
    </ViewLayout>
  );
}
