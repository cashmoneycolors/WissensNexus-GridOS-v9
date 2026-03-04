import type { ValidationResult } from './types';

// Minimale Shard-Config: anpassbar.
const REQUIRED_SHARDS = ['core.ui', 'core.metrics', 'core.nav'];

export function validateShardConfig(): ValidationResult {
  // Hier könnte man echte Feature-Flags/Env prüfen.
  // Für jetzt: alles ok, außer bewusst deaktiviert.
  const disabled = (import.meta as any).env?.VITE_DISABLE_SHARDS === '1';

  if (disabled) {
    return { ok: false, missing: REQUIRED_SHARDS, invalid: [] };
  }

  return { ok: true, missing: [], invalid: [] };
}
