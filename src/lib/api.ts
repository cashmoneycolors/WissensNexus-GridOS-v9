export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return (await res.json()) as T;
}

export async function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`${method} ${path} failed`);
  return (await res.json()) as T;
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(path, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`UPLOAD ${path} failed`);
  return (await res.json()) as T;
}
