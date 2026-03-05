import React, { useEffect, useMemo, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Badge, Button, Card } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Tx = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  note: string;
  created_at: number;
};

export default function EarningEngine() {
  const [tx, setTx] = useState<Tx[]>([]);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(120);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const item of tx) {
      if (item.type === 'income') income += item.amount;
      else expense += item.amount;
    }
    return { income, expense, balance: income - expense };
  }, [tx]);

  const loadTransactions = () => {
    apiGet<Tx[]>('/api/transactions', { timeoutMs: 10000, retries: 1 })
      .then((rows) => {
        setTx(rows);
        setError(null);
      })
      .catch(() => setError('Transaktionen konnten nicht geladen werden.'));
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const addTx = async () => {
    if (saving) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Betrag muss groesser als 0 sein.');
      return;
    }

    setSaving(true);
    try {
      const row = await apiSend<Tx>(
        '/api/transactions',
        'POST',
        {
          type,
          amount,
          currency: 'CHF',
          note: note || 'Manual entry'
        },
        { timeoutMs: 12000, retries: 1 }
      );
      setTx((prev) => [row, ...prev]);
      setNote('');
      setError(null);
    } catch {
      setError('Transaktion konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ViewLayout
      title="Earning Engine"
      subtitle="Echter Ledger mit Summen + Einträgen aus SQLite."
      right={<Badge tone={totals.balance >= 0 ? 'good' : 'bad'}>Balance {totals.balance.toFixed(2)} CHF</Badge>}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr,340px]">
        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Income {totals.income.toFixed(2)} CHF</Badge>
            <Badge tone="warn">Expense {totals.expense.toFixed(2)} CHF</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {error && <div className="text-xs text-rose-300">{error}</div>}
            {tx.slice(0, 20).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-sm"
              >
                <div className="truncate">
                  <span className="font-semibold">{t.note}</span>
                  <span className="ml-2 text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</span>
                </div>
                <div className={t.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}>
                  {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)} {t.currency}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-bold">Neuer Eintrag</div>
          <div className="mt-3 space-y-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'income' | 'expense')}
              aria-label="Transaction type"
              className="w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label="Amount"
              className="w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notiz"
              className="w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
            />
            <Button onClick={addTx} disabled={saving}>Add Transaction</Button>
          </div>
        </Card>
      </div>
    </ViewLayout>
  );
}
