import React, { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Badge, Button, Card } from './ui';
import { apiSend } from '../lib/api';

type TrainResult = {
  samples: number;
  test: number;
  accuracy: number;
};

export default function TrainingCenter() {
  const [result, setResult] = useState<TrainResult | null>(null);
  const [busy, setBusy] = useState(false);

  const train = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiSend<TrainResult>('/api/train', 'POST');
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ViewLayout title="Training Center" subtitle="Echtes Modelltraining + Accuracy-Report.">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge>Model: Naive Bayes</Badge>
          {result ? (
            <Badge tone={result.accuracy >= 0.95 ? 'good' : 'warn'}>
              Accuracy {(result.accuracy * 100).toFixed(2)}%
            </Badge>
          ) : null}
        </div>
        <div className="text-sm text-slate-300">
          Training läuft gegen ein synthetisches, kontrolliertes Dataset (ops/market/infra).
          Ergebnis wird serverseitig validiert.
        </div>
        <Button onClick={train} disabled={busy}>
          {busy ? 'Training…' : 'Train Model'}
        </Button>

        {result ? (
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 text-sm">
            <div>Samples: {result.samples}</div>
            <div>Test Set: {result.test}</div>
            <div>Accuracy: {(result.accuracy * 100).toFixed(2)}%</div>
          </div>
        ) : null}
      </Card>
    </ViewLayout>
  );
}
