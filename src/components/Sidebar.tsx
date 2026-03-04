import React from 'react';
import { AppView } from '../types';
import { Badge, Card } from './ui';

type Props = {
  open: boolean;
  activeView: AppView;
  onSelect: (view: AppView) => void;
  onClose: () => void;
};

const items: Array<{ view: AppView; label: string }> = [
  { view: AppView.DASHBOARD, label: 'Dashboard' },
  { view: AppView.AGENT_CONTROL, label: 'Agent Control' },
  { view: AppView.MISSION_CONTROL, label: 'Task Matrix' },
  { view: AppView.LIVE_VOICE, label: 'Live Assistant' },
  { view: AppView.NEURAL_CHAT, label: 'Neural Chat' },
  { view: AppView.MEMORY_VAULT, label: 'Memory Vault' },
  { view: AppView.EARNING_ENGINE, label: 'Earning Engine' },
  { view: AppView.PAYPAL_BUSINESS, label: 'PayPal Business' },
  { view: AppView.MARKET_INSIGHTS, label: 'Market Insights' },
  { view: AppView.CLOUD_INFRA, label: 'Cloud Infra' },
  { view: AppView.TOOLBOX, label: 'Toolbox' },
  { view: AppView.MINI_IDE, label: 'Mini IDE' },
  { view: AppView.MEDIA_ANALYZER, label: 'Media Analyzer' },
  { view: AppView.AUDIO_STT, label: 'Audio Transcriber' },
  { view: AppView.COGNITIVE_LAB, label: 'Cognitive Lab' },
  { view: AppView.NEURAL_MAP, label: 'Neural Map' },
  { view: AppView.TRAINING_CENTER, label: 'Training Center' }
];

export default function Sidebar({ open, activeView, onSelect, onClose }: Props) {
  return (
    <>
      <div
        className={
          'fixed inset-0 z-40 bg-black/70 backdrop-blur lg:hidden ' +
          (open ? 'block' : 'hidden')
        }
        onClick={onClose}
      />

      <aside
        className={
          'fixed left-0 top-0 z-50 h-dvh w-[min(86vw,360px)] -translate-x-full transition-transform duration-300 lg:sticky lg:top-[64px] lg:z-10 lg:h-[calc(100dvh-64px)] lg:w-[320px] lg:translate-x-0 ' +
          (open ? 'translate-x-0' : '')
        }
      >
        <div className="h-full p-3 sm:p-4">
          <Card className="h-full p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-black tracking-wide text-slate-200">Navigation</div>
              <button
                className="lg:hidden rounded-full border border-slate-800/80 bg-slate-900/30 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-900/50"
                onClick={onClose}
              >
                Schließen
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {items.map((it) => {
                const active = it.view === activeView;
                return (
                  <button
                    key={it.view}
                    onClick={() => onSelect(it.view)}
                    className={
                      'flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ' +
                      (active
                        ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-100'
                        : 'border-slate-800/80 bg-slate-950/20 text-slate-200 hover:bg-slate-900/25')
                    }
                  >
                    <span className="truncate">{it.label}</span>
                    {active ? <Badge tone="good">Aktiv</Badge> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tipp: Auf Mobile öffnet sich die Sidebar als Drawer.
            </div>
          </Card>
        </div>
      </aside>
    </>
  );
}
