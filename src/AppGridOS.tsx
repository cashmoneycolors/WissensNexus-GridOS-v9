import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AppView, type SystemMetrics } from './types';
import { validateShardConfig } from './constants';
import { CurrencyService } from './lib/CurrencyService';
import { apiGet } from './lib/api';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GlobalMonitor from './components/GlobalMonitor';

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const AgentControl = React.lazy(() => import('./components/AgentControl'));
const EarningEngine = React.lazy(() => import('./components/EarningEngine'));
const MemoryVault = React.lazy(() => import('./components/MemoryVault'));
const ToolBox = React.lazy(() => import('./components/ToolBox'));
const NeuralChat = React.lazy(() => import('./components/NeuralChat'));
const CognitiveLab = React.lazy(() => import('./components/CognitiveLab'));
const LiveAssistant = React.lazy(() => import('./components/LiveAssistant'));
const NeuralMap = React.lazy(() => import('./components/NeuralMap'));
const MiniIDE = React.lazy(() => import('./components/MiniIDE'));
const CloudInfr = React.lazy(() => import('./components/CloudInfr'));
const TrainingCenter = React.lazy(() => import('./components/TrainingCenter'));
const TaskMatrix = React.lazy(() => import('./components/TaskMatrix'));
const PayPalBusiness = React.lazy(() => import('./components/PayPalBusiness'));
const MediaAnalyzer = React.lazy(() => import('./components/MediaAnalyzer'));
const AudioTranscriber = React.lazy(() => import('./components/AudioTranscriber'));
const MarketInsights = React.lazy(() => import('./components/MarketInsights'));

const clampText = {
  title: 'text-[clamp(1.25rem,3.2vw,2.2rem)]',
  subtitle: 'text-[clamp(0.85rem,2.4vw,1.05rem)]'
};

const AppGridOS: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isBooted, setIsBooted] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [systemGateOpen, setSystemGateOpen] = useState(false);

  const [validationErrors, setValidationErrors] = useState<{ missing: string[]; invalid: string[] } | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    load: 12,
    multiplier: 1,
    uptime: 0,
    shardsActive: 3,
    globalIndex: 124800.42,
    merchantBalance: 12480.5,
    totalSpentCHF: 0.42,
    dailyBudgetCHF: 100
  });

  // 1) Init/Validation (schnell, robust)
  useEffect(() => {
    const initialize = async () => {
      await CurrencyService.syncLiveRates();
      const validation = validateShardConfig();
      if (!validation.ok) setValidationErrors({ missing: validation.missing, invalid: validation.invalid });
    };
    initialize().catch(() => {
      setValidationErrors({ missing: ['boot.init'], invalid: [] });
    });
  }, []);

  // 2) Boot Progress – bewusst „klein“ & responsive
  useEffect(() => {
    if (bootProgress >= 100) {
      const t = setTimeout(() => {
        setIsBooted(true);
        setSystemGateOpen(true);
      }, 450);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setBootProgress((p) => Math.min(100, p + 12)), 220);
    return () => clearTimeout(t);
  }, [bootProgress]);

  // 3) Metrics update (real API)
  const refreshMetrics = useCallback(async () => {
    try {
      const m = await apiGet<SystemMetrics>('/api/metrics', { timeoutMs: 9000, retries: 1 });
      setMetrics(m);
    } catch {
      // keep previous metrics if backend is down
    }
  }, []);

  useEffect(() => {
    if (!isBooted) return;
    refreshMetrics();
    const i = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshMetrics();
    }, 6000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshMetrics();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(i);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isBooted, refreshMetrics]);

  // 4) View
  const viewNode = useMemo(() => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard metrics={metrics} />;
      case AppView.AGENT_CONTROL:
        return <AgentControl />;
      case AppView.EARNING_ENGINE:
        return <EarningEngine />;
      case AppView.MEMORY_VAULT:
        return <MemoryVault />;
      case AppView.TOOLBOX:
        return <ToolBox />;
      case AppView.NEURAL_CHAT:
        return <NeuralChat />;
      case AppView.COGNITIVE_LAB:
        return <CognitiveLab />;
      case AppView.LIVE_VOICE:
        return <LiveAssistant />;
      case AppView.NEURAL_MAP:
        return <NeuralMap />;
      case AppView.MINI_IDE:
        return <MiniIDE />;
      case AppView.CLOUD_INFRA:
        return <CloudInfr />;
      case AppView.TRAINING_CENTER:
        return <TrainingCenter />;
      case AppView.MISSION_CONTROL:
        return <TaskMatrix />;
      case AppView.PAYPAL_BUSINESS:
        return <PayPalBusiness />;
      case AppView.MEDIA_ANALYZER:
        return <MediaAnalyzer />;
      case AppView.AUDIO_STT:
        return <AudioTranscriber />;
      case AppView.MARKET_INSIGHTS:
        return <MarketInsights />;
      default:
        return <Dashboard metrics={metrics} />;
    }
  }, [currentView, metrics]);

  if (!isBooted) {
    return (
      <div className="min-h-dvh w-full bg-black safe-px flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-slate-950/40 p-5 backdrop-blur">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className={`font-black italic tracking-tight text-emerald-400 ${clampText.title}`}>GridOS v9</h1>
            <span className="text-xs text-slate-400 font-mono">{bootProgress}%</span>
          </div>
          <p className={`mt-1 text-slate-400 ${clampText.subtitle}`}>Initialisierung & Shard-Handshake</p>

          <div className="mt-4">
            <progress
              className="boot-progress"
              value={bootProgress}
              max={100}
              aria-label="Boot progress"
            />
          </div>

          {validationErrors && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-sm text-rose-200">
              <div className="font-bold">Konfig-Check fehlgeschlagen</div>
              <div className="mt-1 text-rose-200/80">
                Missing: {validationErrors.missing.join(', ') || '—'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-black text-slate-100 safe-px overflow-x-hidden">
      {systemGateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur">
          <div className="w-full max-w-3xl rounded-[1.75rem] border border-emerald-500/30 bg-slate-950/60 p-6 sm:p-10 shadow-[0_0_80px_rgba(16,185,129,0.18)]">
            <div className="flex flex-col gap-4">
              <h2 className="text-[clamp(1.5rem,5.5vw,3.25rem)] font-black italic text-emerald-400 leading-none">
                HANDSHAKE InOK
              </h2>
              <p className="text-slate-200/80 text-[clamp(0.9rem,2.6vw,1.2rem)]">
                Grid Production aktiv. UI skaliert automatisch (Smartphone/Tablet/Desktop).
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-widest hover:bg-emerald-500"
                  onClick={() => setSystemGateOpen(false)}
                >
                  Enter Grid
                </button>
                <button
                  className="rounded-full border border-slate-700 bg-slate-950/30 px-6 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900/40"
                  onClick={() => {
                    setCurrentView(AppView.DASHBOARD);
                    setSystemGateOpen(false);
                  }}
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Header
        currentView={currentView}
        metrics={metrics}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />

      <div className="mx-auto flex w-full max-w-[1400px] gap-0 lg:gap-6">
        <Sidebar
          open={sidebarOpen}
          activeView={currentView}
          onClose={() => setSidebarOpen(false)}
          onSelect={(v) => {
            setCurrentView(v);
            setSidebarOpen(false);
          }}
        />

        <main className="min-w-0 flex-1 px-4 sm:px-6 lg:px-0 py-4 sm:py-6">
          <Suspense
            fallback={
              <div className="flex min-h-[50dvh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/30">
                <div className="text-emerald-400 font-black tracking-widest uppercase text-xs">Shard Sync…</div>
              </div>
            }
          >
            {viewNode}
          </Suspense>

          <div className="h-20" />
        </main>
      </div>

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <GlobalMonitor metrics={metrics} />
      </div>
    </div>
  );
};

export default AppGridOS;
