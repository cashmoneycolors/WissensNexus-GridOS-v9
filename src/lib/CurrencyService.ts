type Rates = Record<string, number>;

export class CurrencyService {
  private static lastSyncTs = 0;
  private static rates: Rates = { CHF: 1, EUR: 0.95, USD: 1.08 };

  static getRates() {
    return { ...this.rates };
  }

  static async syncLiveRates(): Promise<void> {
    // Robust: kein Hard-Fail wenn offline.
    // Wenn du eine API nutzen willst, setze VITE_RATES_URL.
    const url = (import.meta as any).env?.VITE_RATES_URL as string | undefined;
    const now = Date.now();

    if (now - this.lastSyncTs < 60_000) return;
    this.lastSyncTs = now;

    if (!url) return;

    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return;
      const data = (await res.json()) as unknown;
      if (typeof data === 'object' && data && 'rates' in (data as any)) {
        const rates = (data as any).rates as Rates;
        if (rates && typeof rates.CHF === 'number') this.rates = rates;
      }
    } catch {
      // silent
    }
  }
}
