type ApiOptions = {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 12000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse<T>(res: Response, label: string): Promise<T> {
  const raw = await res.text();
  const isJson = (res.headers.get('content-type') || '').toLowerCase().includes('application/json');
  const data = raw && isJson ? JSON.parse(raw) : raw;

  if (!res.ok) {
    const detail =
      typeof data === 'object' && data && 'error' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).error)
        : raw || `HTTP ${res.status}`;
    throw new Error(`${label} failed: ${detail}`);
  }

  return data as T;
}

async function requestWithRetry<T>(
  path: string,
  init: RequestInit,
  label: string,
  options?: ApiOptions
): Promise<T> {
  const retries = Math.max(0, options?.retries ?? 1);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const ac = new AbortController();
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => ac.abort(), timeoutMs);

    const onAbort = () => ac.abort();
    options?.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const res = await fetch(path, { ...init, signal: ac.signal });
      return await parseResponse<T>(res, label);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await delay(250 * (attempt + 1));
      }
    } finally {
      clearTimeout(timeout);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(`${label} failed`);
}

export async function apiGet<T>(path: string, options?: ApiOptions): Promise<T> {
  return requestWithRetry<T>(path, { method: 'GET' }, `GET ${path}`, options);
}

export async function apiSend<T>(
  path: string,
  method: string,
  body?: unknown,
  options?: ApiOptions
): Promise<T> {
  return requestWithRetry<T>(
    path,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    },
    `${method} ${path}`,
    options
  );
}

export async function apiUpload<T>(path: string, file: File, options?: ApiOptions): Promise<T> {
  const fd = new FormData();
  fd.append('file', file);
  return requestWithRetry<T>(path, { method: 'POST', body: fd }, `UPLOAD ${path}`, options);
}
