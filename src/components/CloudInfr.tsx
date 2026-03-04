import React, { useEffect, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card, Badge } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Service = {
  id: string;
  name: string;
  tier: string;
  status: string;
  region: string;
  created_at: number;
};

export default function CloudInfr() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    apiGet<Service[]>('/api/services').then(setServices).catch(() => setServices([]));
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    const row = await apiSend<Service>('/api/services', 'POST', { name });
    setServices((prev) => [row, ...prev]);
    setName('');
  };

  return (
    <ViewLayout title="Cloud Infra" subtitle="Service-Inventory mit Status & Region.">
      <div className="grid gap-3 lg:grid-cols-[1fr,320px]">
        <Card className="p-4">
          <div className="space-y-2">
            {services.slice(0, 25).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2">
                <div>
                  <div className="text-sm font-bold text-slate-100">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.region} · {s.tier}</div>
                </div>
                <Badge tone={s.status === 'ok' ? 'good' : 'warn'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-bold">Neuer Service</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service Name"
            className="mt-3 w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
          />
          <Button className="mt-3" onClick={add}>Add Service</Button>
        </Card>
      </div>
    </ViewLayout>
  );
}
