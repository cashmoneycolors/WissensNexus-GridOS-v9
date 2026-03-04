export enum AppView {
  DASHBOARD = 'DASHBOARD',
  AGENT_CONTROL = 'AGENT_CONTROL',
  EARNING_ENGINE = 'EARNING_ENGINE',
  MEMORY_VAULT = 'MEMORY_VAULT',
  TOOLBOX = 'TOOLBOX',
  NEURAL_CHAT = 'NEURAL_CHAT',
  COGNITIVE_LAB = 'COGNITIVE_LAB',
  LIVE_VOICE = 'LIVE_VOICE',
  NEURAL_MAP = 'NEURAL_MAP',
  MINI_IDE = 'MINI_IDE',
  CLOUD_INFRA = 'CLOUD_INFRA',
  TRAINING_CENTER = 'TRAINING_CENTER',
  MISSION_CONTROL = 'MISSION_CONTROL',
  PAYPAL_BUSINESS = 'PAYPAL_BUSINESS',
  MEDIA_ANALYZER = 'MEDIA_ANALYZER',
  AUDIO_STT = 'AUDIO_STT',
  MARKET_INSIGHTS = 'MARKET_INSIGHTS'
}

export type ProductNiche = {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
};

export type SystemMetrics = {
  load: number;
  multiplier: number;
  uptime: number;
  shardsActive: number;
  globalIndex: number;
  merchantBalance: number;
  totalSpentCHF: number;
  dailyBudgetCHF: number;
};

export type ValidationResult = {
  ok: boolean;
  missing: string[];
  invalid: string[];
};
