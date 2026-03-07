import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.sqlite');

let SQL;
let db;

export async function initDb() {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: (f) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) });
  }

  if (db) return db;

  if (fs.existsSync(dbPath)) {
    const file = fs.readFileSync(dbPath);
    db = new SQL.Database(file);
  } else {
    db = new SQL.Database();
  }

  migrate();
  seedIfEmpty();
  persist();

  return db;
}

export function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 2,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      template TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      status TEXT NOT NULL,
      region TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      client TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_analyses (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      stats TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_settings (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      throttle INTEGER NOT NULL,
      auto_fix INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      fact TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      product_id TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      provider_ref TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      token TEXT NOT NULL,
      file_path TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      destination TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_catalog (
      category TEXT PRIMARY KEY,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_rules (
      category TEXT PRIMARY KEY,
      prompt_override TEXT NOT NULL,
      description_template TEXT NOT NULL,
      cover_template TEXT NOT NULL,
      price_mode TEXT NOT NULL DEFAULT 'fixed',
      price_per_word REAL NOT NULL DEFAULT 0,
      min_price REAL NOT NULL DEFAULT 0,
      max_price REAL NOT NULL DEFAULT 0,
      min_words INTEGER NOT NULL DEFAULT 0,
      max_words INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_meta (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_path TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_jobs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      next_run INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      signature_hash TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT NOT NULL,
      received_at INTEGER NOT NULL,
      processed_at INTEGER
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_event_id
      ON webhook_events(provider, event_id);

    CREATE TABLE IF NOT EXISTS request_traces (
      id TEXT PRIMARY KEY,
      method TEXT NOT NULL,
      route TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      latency_ms REAL NOT NULL,
      ok INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_request_traces_created_at
      ON request_traces(created_at);

    CREATE TABLE IF NOT EXISTS business_alerts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      interest_score REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL,
      last_contact_at INTEGER,
      next_followup_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS followup_actions (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      action_type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      processed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS pricing_actions (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      previous_price REAL NOT NULL,
      new_price REAL NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_allocation_actions (
      id TEXT PRIMARY KEY,
      total_budget REAL NOT NULL,
      allocation_json TEXT NOT NULL,
      rationale TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ops_history (
      id TEXT PRIMARY KEY,
      worker_utilization REAL NOT NULL,
      webhook_utilization REAL NOT NULL,
      pending_jobs INTEGER NOT NULL,
      failed_jobs INTEGER NOT NULL,
      avg_latency_ms REAL NOT NULL,
      p95_latency_ms REAL NOT NULL,
      error_rate REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ops_history_created_at
      ON ops_history(created_at);

    CREATE TABLE IF NOT EXISTS ops_alerts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ops_alerts_created_at
      ON ops_alerts(created_at);

    CREATE TABLE IF NOT EXISTS replay_rate_counters (
      minute_bucket INTEGER NOT NULL,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      hits INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (minute_bucket, provider, event_type)
    );

    CREATE INDEX IF NOT EXISTS idx_replay_rate_counters_updated_at
      ON replay_rate_counters(updated_at);

    CREATE TABLE IF NOT EXISTS ops_playbook_actions (
      id TEXT PRIMARY KEY,
      alert_kind TEXT NOT NULL,
      severity TEXT NOT NULL,
      action_name TEXT NOT NULL,
      status TEXT NOT NULL,
      before_json TEXT NOT NULL,
      after_json TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      reason TEXT NOT NULL,
      rollback_json TEXT NOT NULL,
      rollback_reason TEXT NOT NULL,
      approved_by TEXT NOT NULL,
      approved_at INTEGER,
      created_at INTEGER NOT NULL,
      rolled_back_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_ops_playbook_actions_created_at
      ON ops_playbook_actions(created_at);

    CREATE INDEX IF NOT EXISTS idx_ops_playbook_actions_status
      ON ops_playbook_actions(status);
  `);

  const ensureColumn = (table, column, def) => {
    const info = db.exec(`PRAGMA table_info(${table});`);
    if (!info.length) return;
    const nameIdx = info[0].columns.indexOf('name');
    const has = info[0].values.some((row) => row[nameIdx] === column);
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
  };

  ensureColumn('product_rules', 'price_mode', "TEXT NOT NULL DEFAULT 'fixed'");
  ensureColumn('product_rules', 'price_per_word', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('product_rules', 'min_price', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('product_rules', 'max_price', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('product_rules', 'min_words', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('product_rules', 'max_words', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('product_meta', 'word_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('ops_playbook_actions', 'plan_json', 'TEXT NOT NULL DEFAULT "{}"');
  ensureColumn('ops_playbook_actions', 'approved_by', 'TEXT NOT NULL DEFAULT ""');
  ensureColumn('ops_playbook_actions', 'approved_at', 'INTEGER');
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

export function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] ?? null;
}

export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  persist();
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const now = () => Date.now();

// --- NEW HELPER FOR AI CONTEXT ---
export function getRecentContext() {
    const tasks = all('SELECT title, done, priority FROM tasks ORDER BY created_at DESC LIMIT 5');
    const notes = all('SELECT title, body FROM notes ORDER BY created_at DESC LIMIT 3');
    const knowledge = all('SELECT id, fact FROM knowledge ORDER BY created_at DESC LIMIT 15'); // <--- MEHR KONTEXT
    
    // Format JSON-like string for the prompt
    return `
=== VERGISSNIX MEMORY STREAM ===
TASKS (Active):
${tasks.map(t => `- [${t.done ? 'x' : ' '}] ${t.title} (Prio ${t.priority})`).join('\n')}

NOTES (Context):
${notes.map(n => `- ${n.title}: ${n.body.slice(0, 50)}...`).join('\n')}

MERKX KNOWLEDGE BASE (Permanent):
${knowledge.map(k => `[ID:${k.id}] ${k.fact}`).join('\n')}
================================
`;
}
// ---------------------------------

const words = ['grid', 'nexus', 'quantum', 'signal', 'pipeline', 'vector', 'ledger', 'core', 'flow', 'engine', 'node', 'shard'];
const clients = ['Asterix GmbH', 'Orion Labs', 'NexaSoft', 'SkyForge', 'Polar AI', 'Aurora Studio'];
const regions = ['eu-west', 'eu-central', 'us-east', 'ap-south'];

function uid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function makeTitle(i) {
  return `${words[i % words.length]}-${i + 1}`;
}

export function seedIfEmpty() {
  const counts = {
    tasks: get('SELECT COUNT(*) as c FROM tasks')?.c ?? 0,
    notes: get('SELECT COUNT(*) as c FROM notes')?.c ?? 0,
    prompts: get('SELECT COUNT(*) as c FROM prompts')?.c ?? 0,
    transactions: get('SELECT COUNT(*) as c FROM transactions')?.c ?? 0,
    services: get('SELECT COUNT(*) as c FROM services')?.c ?? 0,
    invoices: get('SELECT COUNT(*) as c FROM invoices')?.c ?? 0,
    transcripts: get('SELECT COUNT(*) as c FROM transcripts')?.c ?? 0,
    media_analyses: get('SELECT COUNT(*) as c FROM media_analyses')?.c ?? 0,
    agent_settings: get('SELECT COUNT(*) as c FROM agent_settings')?.c ?? 0
  };

  if (counts.tasks === 0) {
    for (let i = 0; i < 120; i++) {
      run('INSERT INTO tasks (id, title, done, priority, created_at) VALUES (?, ?, ?, ?, ?)', [
        uid('task'),
        `Task ${i + 1}: ${makeTitle(i)} checkpoint`,
        i % 5 === 0 ? 1 : 0,
        rand(1, 3),
        now()
      ]);
    }
  }

  if (counts.notes === 0) {
    for (let i = 0; i < 120; i++) {
      run('INSERT INTO notes (id, title, body, tags, created_at) VALUES (?, ?, ?, ?, ?)', [
        uid('note'),
        `Memory ${i + 1}: ${makeTitle(i)}`,
        `Context ${i + 1}: ${words.join(' ')}. Dieser Eintrag enthält wichtige Observationsdaten für das Grid.`,
        i % 2 === 0 ? 'ops,core' : 'market,insights',
        now()
      ]);
    }
  }

  if (counts.prompts === 0) {
    for (let i = 0; i < 40; i++) {
      run('INSERT INTO prompts (id, title, template, created_at) VALUES (?, ?, ?, ?)', [
        uid('prompt'),
        `Prompt ${i + 1}`,
        `Du bist ein System für ${makeTitle(i)}. Liefere klare Schritte + Risiken + KPIs.`,
        now()
      ]);
    }
  }

  if (counts.transactions === 0) {
    for (let i = 0; i < 120; i++) {
      const type = i % 3 === 0 ? 'expense' : 'income';
      const amount = type === 'income' ? rand(100, 800) : rand(20, 300);
      run('INSERT INTO transactions (id, type, amount, currency, note, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        uid('txn'),
        type,
        amount,
        'CHF',
        `Ledger ${i + 1}: ${makeTitle(i)}`,
        now()
      ]);
    }
  }

  if (counts.services === 0) {
    for (let i = 0; i < 30; i++) {
      run('INSERT INTO services (id, name, tier, status, region, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        uid('svc'),
        `Service ${i + 1}`,
        i % 2 === 0 ? 'prod' : 'staging',
        i % 3 === 0 ? 'warning' : 'ok',
        regions[i % regions.length],
        now()
      ]);
    }
  }

  if (counts.invoices === 0) {
    for (let i = 0; i < 60; i++) {
      run('INSERT INTO invoices (id, client, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        uid('inv'),
        clients[i % clients.length],
        rand(300, 2400),
        'CHF',
        i % 4 === 0 ? 'overdue' : 'sent',
        now()
      ]);
    }
  }

  if (counts.transcripts === 0) {
    for (let i = 0; i < 20; i++) {
      run('INSERT INTO transcripts (id, source, text, created_at) VALUES (?, ?, ?, ?)', [
        uid('trn'),
        'seed',
        `Transcript ${i + 1}: ${words.join(' ')}.`,
        now()
      ]);
    }
  }

  if (counts.media_analyses === 0) {
    for (let i = 0; i < 20; i++) {
      run('INSERT INTO media_analyses (id, kind, summary, stats, created_at) VALUES (?, ?, ?, ?, ?)', [
        uid('media'),
        'text',
        `Analyse ${i + 1}: basic metrics`,
        JSON.stringify({ words: 120 + i, chars: 500 + i * 3 }),
        now()
      ]);
    }
  }

  if (counts.agent_settings === 0) {
    run('INSERT INTO agent_settings (id, mode, throttle, auto_fix, created_at) VALUES (?, ?, ?, ?, ?)', [
      uid('agent'),
      'balanced',
      70,
      1,
      now()
    ]);
  }

  // --- SEED SETTINGS ---
  const existingBudget = get('SELECT value FROM global_settings WHERE key = ?', ['daily_budget']);
  if (!existingBudget) {
    run('INSERT INTO global_settings (key, value) VALUES (?, ?)', ['daily_budget', '100']);
  }

  const defaults = [
    ['executive_role', 'CEO'],
    ['alert_margin_threshold', '0.20'],
    ['alert_runway_days_threshold', '90'],
    ['alert_critical_tasks_threshold', '25'],
    ['weekly_ops_enabled', '1'],
    ['weekly_ops_last_key', ''],
    ['auto_pricing_enabled', '0'],
    ['auto_pricing_max_step_pct', '0.10'],
    ['auto_pricing_min_price_floor', '5'],
    ['conversion_target', '0.03'],
    ['followup_enabled', '1'],
    ['followup_interval_hours', '48'],
    ['followup_max_touchpoints', '5']
  ];

  for (const [key, value] of defaults) {
    const existing = get('SELECT value FROM global_settings WHERE key = ?', [key]);
    if (!existing) run('INSERT INTO global_settings (key, value) VALUES (?, ?)', [key, value]);
  }
}
