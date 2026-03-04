import React, { useEffect, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Card, Badge } from './ui';
import { apiGet } from '../lib/api';

type Insight = {
  trend: string;
  recentTransactions: Array<{ id: string; note: string; amount: number; currency: string; type: string }>;
  recentNotes: Array<{ id: string; title: string; tags: string }>;
};

export default function MarketInsights() {
  const [data, setData] = useState<Insight | null>(null);

  useEffect(() => {
    apiGet<Insight>('/api/insights').then(setData).catch(() => setData(null));
  }, []);

  return (
    <ViewLayout title="Market Insights" subtitle="Dynamische Trends aus echten Daten.">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold">Trend</div>
            <Badge tone={data?.trend === 'active' ? 'good' : 'warn'}>{data?.trend ?? '—'}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {data?.recentTransactions?.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-sm">
                <div className="truncate">{t.note}</div>
                <div className={t.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}>
                  {t.amount.toFixed(2)} {t.currency}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-bold">Recent Signals</div>
          <div className="mt-3 space-y-2">
            {data?.recentNotes?.slice(0, 8).map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-sm">
                <div className="font-semibold">{n.title}</div>
                <div className="text-xs text-slate-400">{n.tags}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ViewLayout>
  );
}
