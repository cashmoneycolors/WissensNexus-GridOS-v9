import React, { useEffect, useMemo, useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button, Card, Badge } from './ui';
import { apiGet, apiSend } from '../lib/api';

type Invoice = {
  id: string;
  client: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
};

type Tx = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  note: string;
  created_at: number;
};

type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  created_at: number;
};

type PaymentStatus = {
  stripe: boolean;
  paypal: boolean;
  earningsMode: string;
  emailDelivery: boolean;
};

type CatalogItem = {
  category: string;
  price: number;
  currency: string;
  enabled: number;
  updated_at: number;
};

type RuleItem = {
  category: string;
  prompt_override: string;
  description_template: string;
  cover_template: string;
  updated_at: number;
};

type Order = {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  product_id: string;
  buyer_email: string;
  provider_ref: string;
  created_at: number;
};

type Delivery = {
  id: string;
  order_id: string;
  channel: string;
  destination: string;
  created_at: number;
};

type ExecutiveRole = {
  role: 'CEO' | 'CFO' | 'COO';
  directive: string;
};

type BusinessAlert = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: number;
  created_at: number;
};

type FunnelOverview = {
  window: string;
  productsCreated: number;
  orders: number;
  revenue: number;
  conversion: number;
  aov: number;
  conversionTarget: number;
  byCategory: Array<{
    category: string;
    listedPrice: number;
    currency: string;
    productsCreated: number;
    orders: number;
    revenue: number;
    conversion: number;
    aov: number;
  }>;
};

type AutoPricingSettings = {
  enabled: boolean;
  maxStepPct: number;
  minPriceFloor: number;
  conversionTarget: number;
};

type PricingAction = {
  id: string;
  category: string;
  previous_price: number;
  new_price: number;
  reason: string;
  created_at: number;
};

type Lead = {
  id: string;
  email: string;
  name: string;
  source: string;
  status: string;
  interest_score: number;
  notes: string;
  next_followup_at: number | null;
  updated_at: number;
};

type FollowupAction = {
  id: string;
  lead_id: string;
  channel: string;
  action_type: string;
  status: string;
  created_at: number;
  processed_at: number | null;
};

type FollowupSettings = {
  enabled: boolean;
  intervalHours: number;
  maxTouchpoints: number;
};

type PortfolioRankRow = {
  category: string;
  score: number;
  band: string;
  revenue: number;
  orders: number;
  conversion: number;
  productsCreated: number;
  listedPrice: number;
};

type Allocation = {
  category: string;
  band: string;
  score: number;
  amount: number;
};

type BudgetAllocationModel = {
  totalBudget: number;
  allocations: Allocation[];
  rationale: string;
  createdAt?: number;
};

type SimulationScenario = {
  days: number;
  assumptions: {
    priceDeltaPct: number;
    conversionDeltaPct: number;
    costDeltaPct: number;
    growthBias: number;
  };
  projection: {
    revenue: number;
    cost: number;
    net: number;
    margin: number;
  };
};

export default function PayPalBusiness() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ stripe: false, paypal: false, earningsMode: 'real', emailDelivery: false });
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [savingCatalog, setSavingCatalog] = useState('');
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [modeSaving, setModeSaving] = useState(false);
  const [executive, setExecutive] = useState<ExecutiveRole>({ role: 'CEO', directive: '' });
  const [funnel, setFunnel] = useState<FunnelOverview | null>(null);
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);
  const [autoPricing, setAutoPricing] = useState<AutoPricingSettings>({ enabled: false, maxStepPct: 0.1, minPriceFloor: 5, conversionTarget: 0.03 });
  const [pricingActions, setPricingActions] = useState<PricingAction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followups, setFollowups] = useState<FollowupAction[]>([]);
  const [followupSettings, setFollowupSettings] = useState<FollowupSettings>({ enabled: true, intervalHours: 48, maxTouchpoints: 5 });
  const [portfolioRanking, setPortfolioRanking] = useState<PortfolioRankRow[]>([]);
  const [allocationPreview, setAllocationPreview] = useState<BudgetAllocationModel>({ totalBudget: 0, allocations: [], rationale: '' });
  const [allocationLatest, setAllocationLatest] = useState<BudgetAllocationModel | null>(null);
  const [simulationScenarios, setSimulationScenarios] = useState<SimulationScenario[]>([]);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadSource, setLeadSource] = useState('manual');
  const [leadNote, setLeadNote] = useState('');
  const [opsBusy, setOpsBusy] = useState(false);

  const [client, setClient] = useState('');
  const [amount, setAmount] = useState(450);

  const loadAll = async () => {
    const [
      inv,
      tx,
      prod,
      status,
      cat,
      ruleRows,
      orderRows,
      deliveryRows,
      roleRow,
      funnelRow,
      alertRows,
      autopRow,
      pricingRows,
      leadRows,
      followRows,
      followSettings,
      rankRows,
      allocPreview,
      allocLatest,
      simDefault
    ] = await Promise.all([
      apiGet<Invoice[]>('/api/invoices'),
      apiGet<Tx[]>('/api/transactions'),
      apiGet<Product[]>('/api/products'),
      apiGet<PaymentStatus>('/api/payments/status'),
      apiGet<CatalogItem[]>('/api/catalog'),
      apiGet<RuleItem[]>('/api/rules'),
      apiGet<Order[]>('/api/orders'),
      apiGet<Delivery[]>('/api/deliveries'),
      apiGet<ExecutiveRole>('/api/business/role'),
      apiGet<FunnelOverview>('/api/business/funnel'),
      apiGet<BusinessAlert[]>('/api/business/alerts?limit=8'),
      apiGet<AutoPricingSettings>('/api/business/autopricing'),
      apiGet<PricingAction[]>('/api/business/pricing/actions?limit=8'),
      apiGet<Lead[]>('/api/business/leads'),
      apiGet<FollowupAction[]>('/api/business/followups?limit=12'),
      apiGet<FollowupSettings>('/api/business/followups/settings'),
      apiGet<{ ranking: PortfolioRankRow[] }>('/api/business/portfolio/rank'),
      apiGet<BudgetAllocationModel>('/api/business/budget/allocation'),
      apiGet<BudgetAllocationModel>('/api/business/budget/allocation/latest').catch(() => ({ totalBudget: 0, allocations: [], rationale: '' })),
      apiGet<{ scenarios: SimulationScenario[] }>('/api/business/simulate/default')
    ]);
    setInvoices(inv);
    setTransactions(tx);
    setProducts(prod);
    setPaymentStatus(status);
    setCatalog(cat);
    setRules(ruleRows);
    setOrders(orderRows);
    setDeliveries(deliveryRows);
    setExecutive(roleRow);
    setFunnel(funnelRow);
    setAlerts(Array.isArray(alertRows) ? alertRows : alertRows ? [alertRows] : []);
    setAutoPricing(autopRow);
    setPricingActions(Array.isArray(pricingRows) ? pricingRows : pricingRows ? [pricingRows] : []);
    setLeads(leadRows);
    setFollowups(Array.isArray(followRows) ? followRows : followRows ? [followRows] : []);
    setFollowupSettings(followSettings);
    setPortfolioRanking(rankRows?.ranking || []);
    setAllocationPreview(allocPreview);
    setAllocationLatest(allocLatest);
    setSimulationScenarios(simDefault?.scenarios || []);
  };

  useEffect(() => {
    loadAll().catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');
    const paypalToken = params.get('token');

    const clearParams = () => {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    };

    if (checkout === 'stripe' && sessionId) {
      setCheckoutStatus('Stripe: bestaetige Zahlung...');
      apiSend<{ downloadUrl: string }>('/api/checkout/stripe/confirm', 'POST', { sessionId })
        .then((res) => {
          setDownloadUrl(res.downloadUrl);
          setCheckoutStatus('Stripe: Zahlung bestaetigt. Download bereit.');
          return loadAll();
        })
        .catch(() => setCheckoutStatus('Stripe: Zahlung konnte nicht bestaetigt werden.'))
        .finally(clearParams);
    }

    if (checkout === 'paypal' && paypalToken) {
      setCheckoutStatus('PayPal: capture...');
      apiSend<{ downloadUrl: string }>('/api/checkout/paypal/capture', 'POST', { orderId: paypalToken })
        .then((res) => {
          setDownloadUrl(res.downloadUrl);
          setCheckoutStatus('PayPal: Zahlung bestaetigt. Download bereit.');
          return loadAll();
        })
        .catch(() => setCheckoutStatus('PayPal: Zahlung konnte nicht bestaetigt werden.'))
        .finally(clearParams);
    }
  }, []);

  const autonomousEarnings = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const startStripeCheckout = async (productId: string) => {
    setCheckoutStatus('Stripe: Checkout wird erstellt...');
    const res = await apiSend<{ url: string }>('/api/checkout/stripe', 'POST', { productId });
    window.location.href = res.url;
  };

  const startPayPalCheckout = async (productId: string) => {
    setCheckoutStatus('PayPal: Checkout wird erstellt...');
    const res = await apiSend<{ url: string }>('/api/checkout/paypal', 'POST', { productId });
    window.location.href = res.url;
  };

  const addInvoice = async () => {
    if (!client.trim()) return;
    const row = await apiSend<Invoice>('/api/invoices', 'POST', { client, amount, currency: 'CHF', status: 'sent' });
    setInvoices((prev) => [row, ...prev]);
    setClient('');
  };

  const updateCatalogItem = async (item: CatalogItem) => {
    setSavingCatalog(item.category);
    try {
      const updated = await apiSend<CatalogItem>('/api/catalog', 'PUT', {
        category: item.category,
        price: Number(item.price),
        currency: item.currency,
        enabled: item.enabled
      });
      setCatalog((prev) => prev.map((c) => (c.category === updated.category ? updated : c)));
      const rule = rules.find((r) => r.category === item.category);
      if (rule) {
        await apiSend<RuleItem>('/api/rules', 'PUT', {
          category: rule.category,
          prompt_override: rule.prompt_override,
          description_template: rule.description_template,
          cover_template: rule.cover_template
        });
      }
    } finally {
      setSavingCatalog('');
    }
  };

  const updateRuleLocal = (category: string, patch: Partial<RuleItem>) => {
    setRules((prev) => prev.map((r) => (r.category === category ? { ...r, ...patch } : r)));
  };

  const setEarningsMode = async (mode: 'real' | 'sim') => {
    setModeSaving(true);
    try {
      await apiSend<{ mode: string }>('/api/settings/earnings_mode', 'PUT', { mode });
      setPaymentStatus((prev) => ({ ...prev, earningsMode: mode }));
    } finally {
      setModeSaving(false);
    }
  };

  const getOrderDownload = async (orderId: string) => {
    const res = await apiGet<{ downloadUrl: string }>(`/api/orders/${orderId}/download`);
    setDownloadUrl(res.downloadUrl);
  };

  const saveRole = async (role: 'CEO' | 'CFO' | 'COO') => {
    setOpsBusy(true);
    try {
      const row = await apiSend<ExecutiveRole>('/api/business/role', 'PUT', { role });
      setExecutive(row);
    } finally {
      setOpsBusy(false);
    }
  };

  const saveAutoPricing = async () => {
    setOpsBusy(true);
    try {
      const row = await apiSend<AutoPricingSettings>('/api/business/autopricing', 'PUT', autoPricing);
      setAutoPricing(row);
    } finally {
      setOpsBusy(false);
    }
  };

  const acknowledgeAlerts = async () => {
    setOpsBusy(true);
    try {
      await apiSend('/api/business/alerts/ack_all', 'POST', {});
      await loadAll();
    } finally {
      setOpsBusy(false);
    }
  };

  const runFollowupsNow = async () => {
    setOpsBusy(true);
    try {
      await apiSend('/api/business/followups/run', 'POST', {});
      await loadAll();
    } finally {
      setOpsBusy(false);
    }
  };

  const addLead = async () => {
    if (!leadEmail.trim()) return;
    setOpsBusy(true);
    try {
      await apiSend<Lead>('/api/business/leads', 'POST', {
        email: leadEmail.trim(),
        name: leadName.trim(),
        source: leadSource,
        notes: leadNote.trim(),
        interestScore: 0.6
      });
      setLeadEmail('');
      setLeadName('');
      setLeadNote('');
      await loadAll();
    } finally {
      setOpsBusy(false);
    }
  };

  const updateLeadStatus = async (lead: Lead, status: string) => {
    setOpsBusy(true);
    try {
      await apiSend(`/api/business/leads/${lead.id}`, 'PATCH', { status });
      await loadAll();
    } finally {
      setOpsBusy(false);
    }
  };

  const applyBudgetAllocation = async () => {
    setOpsBusy(true);
    try {
      await apiSend('/api/business/budget/allocation/apply', 'POST', { budget: allocationPreview.totalBudget });
      await loadAll();
    } finally {
      setOpsBusy(false);
    }
  };

  const refreshSimulation = async () => {
    setOpsBusy(true);
    try {
      const sim = await apiGet<{ scenarios: SimulationScenario[] }>('/api/business/simulate/default');
      setSimulationScenarios(sim.scenarios || []);
    } finally {
      setOpsBusy(false);
    }
  };

  return (
    <ViewLayout title="PayPal Business Hub" subtitle="Live Checkout & Download Delivery.">
      <div className="grid gap-3 lg:grid-cols-[1fr,360px] h-full">
        <div className="space-y-3 flex flex-col h-full">
          <Card className="p-5 border-emerald-500/30 bg-emerald-950/20">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Gesamtumsatz (Real)</div>
                <div className="text-3xl font-black text-white mt-1">{autonomousEarnings.toFixed(2)} <span className="text-lg font-normal text-emerald-200">CHF</span></div>
                <div className="text-xs text-emerald-200/60 mt-2">
                  Einnahmen nur nach erfolgreicher Zahlung.
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                Stripe: <span className={paymentStatus.stripe ? 'text-emerald-400' : 'text-rose-400'}>{paymentStatus.stripe ? 'Live' : 'Off'}</span>
                <br />
                PayPal: <span className={paymentStatus.paypal ? 'text-emerald-400' : 'text-rose-400'}>{paymentStatus.paypal ? 'Live' : 'Off'}</span>
                <br />
                Mode: <span className="text-slate-200">{paymentStatus.earningsMode}</span>
                <br />
                Email: <span className={paymentStatus.emailDelivery ? 'text-emerald-400' : 'text-rose-400'}>{paymentStatus.emailDelivery ? 'On' : 'Off'}</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => setEarningsMode('real')}
                disabled={modeSaving || paymentStatus.earningsMode === 'real'}
                className={paymentStatus.earningsMode === 'real' ? 'bg-emerald-600' : 'bg-slate-800'}
              >
                Real
              </Button>
              <Button
                onClick={() => setEarningsMode('sim')}
                disabled={modeSaving || paymentStatus.earningsMode === 'sim'}
                className={paymentStatus.earningsMode === 'sim' ? 'bg-amber-600' : 'bg-slate-800'}
              >
                Simulation
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-bold text-slate-300 mb-3">Executive Intelligence</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
                <div className="text-xs text-slate-400">Rollenprofil</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['CEO', 'CFO', 'COO'] as const).map((r) => (
                    <Button
                      key={r}
                      onClick={() => saveRole(r)}
                      disabled={opsBusy || executive.role === r}
                      className={executive.role === r ? 'bg-emerald-600' : 'bg-slate-800'}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-500">{executive.directive}</div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
                <div className="text-xs text-slate-400">Auto-Pricing Guardrails</div>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoPricing.enabled}
                    onChange={(e) => setAutoPricing((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  Aktiv
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <input
                    type="number"
                    value={autoPricing.maxStepPct}
                    onChange={(e) => setAutoPricing((p) => ({ ...p, maxStepPct: Number(e.target.value) }))}
                    aria-label="Max price step"
                    className="rounded border border-slate-700 bg-black/40 px-2 py-1"
                  />
                  <input
                    type="number"
                    value={autoPricing.minPriceFloor}
                    onChange={(e) => setAutoPricing((p) => ({ ...p, minPriceFloor: Number(e.target.value) }))}
                    aria-label="Min price floor"
                    className="rounded border border-slate-700 bg-black/40 px-2 py-1"
                  />
                  <input
                    type="number"
                    value={autoPricing.conversionTarget}
                    onChange={(e) => setAutoPricing((p) => ({ ...p, conversionTarget: Number(e.target.value) }))}
                    aria-label="Conversion target"
                    className="rounded border border-slate-700 bg-black/40 px-2 py-1"
                  />
                </div>
                <Button className="mt-2" onClick={saveAutoPricing} disabled={opsBusy}>Save Guardrails</Button>
              </div>
            </div>

            {funnel && (
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <Badge>Orders {funnel.orders}</Badge>
                <Badge>Products {funnel.productsCreated}</Badge>
                <Badge>Conversion {(funnel.conversion * 100).toFixed(2)}%</Badge>
                <Badge tone={funnel.conversion >= funnel.conversionTarget ? 'good' : 'warn'}>
                  Target {(funnel.conversionTarget * 100).toFixed(2)}%
                </Badge>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => apiSend('/api/business/alerts/evaluate', 'POST', {}).then(loadAll)} disabled={opsBusy}>Run Cycle Now</Button>
              <Button variant="ghost" onClick={acknowledgeAlerts} disabled={opsBusy}>Ack Alerts</Button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
                <div className="text-xs text-slate-400 mb-2">Aktive Alerts</div>
                <div className="space-y-2 max-h-40 overflow-auto custom-scrollbar pr-1">
                  {alerts.filter((a) => Number(a.acknowledged) === 0).slice(0, 6).map((a) => (
                    <div key={a.id} className="text-xs rounded border border-amber-500/20 bg-amber-950/20 px-2 py-1">
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-slate-300">{a.message}</div>
                    </div>
                  ))}
                  {alerts.filter((a) => Number(a.acknowledged) === 0).length === 0 && <div className="text-xs text-slate-500">Keine offenen Alerts.</div>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
                <div className="text-xs text-slate-400 mb-2">Letzte Preis-Aenderungen</div>
                <div className="space-y-2 max-h-40 overflow-auto custom-scrollbar pr-1">
                  {pricingActions.slice(0, 6).map((p) => (
                    <div key={p.id} className="text-xs rounded border border-slate-700 bg-black/30 px-2 py-1">
                      <div className="font-semibold text-slate-200">{p.category}</div>
                      <div className="text-slate-400">{Number(p.previous_price).toFixed(2)}{' -> '}{Number(p.new_price).toFixed(2)} CHF</div>
                    </div>
                  ))}
                  {pricingActions.length === 0 && <div className="text-xs text-slate-500">Noch keine Preis-Aenderungen.</div>}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400 mb-2">Stage 5: Portfolio Ranker + Budget Allocation + 30/60/90 Simulation</div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-300">Top Kategorien</div>
                  {portfolioRanking.slice(0, 3).map((r) => (
                    <div key={r.category} className="text-xs rounded border border-slate-700 bg-black/30 px-2 py-1">
                      {r.category} · Score {r.score.toFixed(1)} · {(r.conversion * 100).toFixed(2)}%
                    </div>
                  ))}
                  {portfolioRanking.length === 0 && <div className="text-xs text-slate-500">Noch kein Ranking.</div>}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-300">Budget Preview ({allocationPreview.totalBudget.toFixed(2)} CHF)</div>
                  {allocationPreview.allocations.slice(0, 4).map((a) => (
                    <div key={a.category} className="text-xs rounded border border-slate-700 bg-black/30 px-2 py-1">
                      {a.category}: {a.amount.toFixed(2)} CHF
                    </div>
                  ))}
                  <Button className="mt-1" onClick={applyBudgetAllocation} disabled={opsBusy}>Apply Allocation</Button>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-300">Simulation 30/60/90</div>
                  {simulationScenarios.map((s) => (
                    <div key={s.days} className="text-xs rounded border border-slate-700 bg-black/30 px-2 py-1">
                      {s.days}d: Net {s.projection.net.toFixed(2)} CHF · Margin {(s.projection.margin * 100).toFixed(1)}%
                    </div>
                  ))}
                  <Button variant="ghost" className="mt-1" onClick={refreshSimulation} disabled={opsBusy}>Refresh Simulation</Button>
                </div>
              </div>

              {allocationLatest?.createdAt && (
                <div className="mt-2 text-[11px] text-slate-500">
                  Last allocation: {new Date(allocationLatest.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-bold text-slate-300 mb-3">Leads & Follow-up Automation</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="Lead E-Mail"
                aria-label="Lead email"
                className="rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
              />
              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Lead Name"
                aria-label="Lead name"
                className="rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr,1fr,auto]">
              <input
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                placeholder="Quelle"
                aria-label="Lead source"
                className="rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
              />
              <input
                value={leadNote}
                onChange={(e) => setLeadNote(e.target.value)}
                placeholder="Notiz"
                aria-label="Lead note"
                className="rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm"
              />
              <Button onClick={addLead} disabled={opsBusy}>Add Lead</Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Follow-up: {followupSettings.enabled ? 'aktiv' : 'aus'}</span>
              <span>Intervall: {followupSettings.intervalHours}h</span>
              <span>Max Touchpoints: {followupSettings.maxTouchpoints}</span>
              <Button className="ml-auto" onClick={runFollowupsNow} disabled={opsBusy}>Run Followups</Button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="space-y-2 max-h-52 overflow-auto custom-scrollbar pr-1">
                {leads.slice(0, 8).map((l) => (
                  <div key={l.id} className="rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-xs">
                    <div className="font-semibold text-slate-100">{l.email}</div>
                    <div className="text-slate-500">{l.source} · {l.status}</div>
                    <div className="mt-1 flex gap-2">
                      <Button className="text-xs" onClick={() => updateLeadStatus(l, 'contacted')} disabled={opsBusy}>Contacted</Button>
                      <Button variant="ghost" className="text-xs" onClick={() => updateLeadStatus(l, 'won')} disabled={opsBusy}>Won</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 max-h-52 overflow-auto custom-scrollbar pr-1">
                {followups.slice(0, 8).map((f) => (
                  <div key={f.id} className="rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-xs">
                    <div className="font-semibold text-slate-100">{f.action_type}</div>
                    <div className="text-slate-500">{f.channel} · {f.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-bold text-slate-300 mb-3">Produkte</div>
            <div className="grid gap-2">
              {products.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2">
                  <div>
                    <div className="text-sm font-bold text-slate-100">{p.title}</div>
                    <div className="text-xs text-slate-400">{p.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-200">{Number(p.price).toFixed(2)} {p.currency}</div>
                    <div className="mt-1 flex gap-2">
                      <Button
                        onClick={() => startStripeCheckout(p.id)}
                        disabled={!paymentStatus.stripe}
                        className={paymentStatus.stripe ? 'bg-indigo-600 hover:bg-indigo-500' : 'opacity-50 cursor-not-allowed'}
                      >
                        Stripe
                      </Button>
                      <Button
                        onClick={() => startPayPalCheckout(p.id)}
                        disabled={!paymentStatus.paypal}
                        className={paymentStatus.paypal ? 'bg-[#0070BA] hover:bg-[#003087]' : 'opacity-50 cursor-not-allowed'}
                      >
                        PayPal
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && <div className="text-center text-slate-500 py-4 text-xs">Noch keine Produkte. Autonomy starten oder Assets erstellen.</div>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-bold text-slate-300 mb-3">Produkt-Katalog (Preissteuerung)</div>
            <div className="grid gap-2">
              {catalog.map((c) => (
                <div key={c.category} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-100">{c.category}</div>
                      <div className="text-xs text-slate-500">{c.currency}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={c.price}
                        onChange={(e) =>
                          setCatalog((prev) => prev.map((x) => x.category === c.category ? { ...x, price: Number(e.target.value) } : x))
                        }
                        aria-label={`Preis ${c.category}`}
                        className="w-24 rounded border border-slate-800/80 bg-black/40 px-2 py-1 text-xs"
                      />
                      <label className="flex items-center gap-1 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={Number(c.enabled) === 1}
                          onChange={(e) =>
                            setCatalog((prev) => prev.map((x) => x.category === c.category ? { ...x, enabled: e.target.checked ? 1 : 0 } : x))
                          }
                        />
                        Aktiv
                      </label>
                      <Button
                        onClick={() => updateCatalogItem(c)}
                        disabled={savingCatalog === c.category}
                        className="text-xs"
                      >
                        {savingCatalog === c.category ? '...' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-[10px] text-slate-400 mb-1">Prompt Override (optional)</div>
                    <textarea
                      value={rules.find((r) => r.category === c.category)?.prompt_override || ''}
                      onChange={(e) => updateRuleLocal(c.category, { prompt_override: e.target.value })}
                      aria-label={`Prompt override ${c.category}`}
                      placeholder="Leer = Standard-Prompt"
                      className="w-full rounded border border-slate-800/80 bg-black/40 px-2 py-2 text-xs"
                      rows={3}
                    />
                  </div>
                </div>
              ))}
              {catalog.length === 0 && <div className="text-center text-slate-500 py-4 text-xs">Kein Katalog gefunden.</div>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-bold text-slate-300 mb-3">Orders (Live)</div>
            <div className="space-y-2 max-h-64 overflow-auto custom-scrollbar pr-2">
              {orders.slice(0, 12).map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-xs">
                  <div>
                    <div className="text-slate-100 font-semibold">{o.provider.toUpperCase()} {o.amount.toFixed(2)} {o.currency}</div>
                    <div className="text-slate-500">{o.product_id} · {o.buyer_email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={o.status === 'paid' ? 'good' : 'warn'}>{o.status}</Badge>
                    <Button onClick={() => getOrderDownload(o.id)} className="text-xs">Download</Button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <div className="text-center text-slate-500 py-4 text-xs">Keine Orders.</div>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-bold text-slate-300 mb-3">Deliveries</div>
            <div className="space-y-2 max-h-56 overflow-auto custom-scrollbar pr-2">
              {deliveries.slice(0, 12).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-xs">
                  <div>
                    <div className="text-slate-100 font-semibold">{d.channel}</div>
                    <div className="text-slate-500">{d.destination}</div>
                  </div>
                  <div className="text-slate-400">{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
              ))}
              {deliveries.length === 0 && <div className="text-center text-slate-500 py-4 text-xs">Keine Deliveries.</div>}
            </div>
          </Card>

          <Card className="p-4 flex-1 overflow-hidden flex flex-col">
            <div className="text-sm font-bold text-slate-300 mb-3">Rechnungs-Historie (Manuell)</div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2">
              {invoices.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2">
                  <div>
                    <div className="text-sm font-bold text-slate-100">{i.client}</div>
                    <div className="text-xs text-slate-400">{new Date(i.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-200">{i.amount.toFixed(2)} {i.currency}</div>
                    <Badge tone={i.status === 'overdue' ? 'bad' : 'good'}>{i.status}</Badge>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <div className="text-center text-slate-500 py-4 text-xs">Keine Rechnungen.</div>}
            </div>
          </Card>
        </div>

        <Card className="p-4 h-fit">
          <div className="text-sm font-bold text-[#0070BA]">Checkout Status</div>
          <div className="text-xs text-slate-400 mb-3">Nur reale Zahlungen erzeugen Download-Links.</div>

          <div className="rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-xs text-slate-200">
            {checkoutStatus || 'Bereit.'}
          </div>

          {downloadUrl && (
            <a
              href={downloadUrl}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-500"
            >
              Download starten
            </a>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="text-sm font-bold text-slate-300">Neurechnung erstellen</div>
            <div className="text-xs text-slate-400 mb-4">Manuelle Rechnung an Kunden senden.</div>

            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              aria-label="Client name"
              placeholder="Kundenname (z.B. Google Inc.)"
              className="w-full rounded-xl border border-slate-800/80 bg-black/40 px-3 py-2 text-sm mb-2"
            />
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-label="Invoice amount"
                className="w-full rounded-xl border border-slate-800/80 bg-black/40 pl-3 pr-12 py-2 text-sm"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">CHF</span>
            </div>
            <Button className="mt-3 w-full bg-[#0070BA] hover:bg-[#003087]" onClick={addInvoice}>
              Create Invoice
            </Button>
          </div>
        </Card>
      </div>
    </ViewLayout>
  );
}
