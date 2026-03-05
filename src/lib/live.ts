type LiveMessage = {
  event: string;
  payload: unknown;
};

type LiveSubscriber = (message: LiveMessage) => void;

type LiveOptions = {
  reconnectMs?: number;
};

function resolveWsUrl() {
  const envUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_WS_URL;
  if (envUrl) return envUrl;

  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}/ws`;
}

export function subscribeLive(subscriber: LiveSubscriber, options?: LiveOptions) {
  const reconnectMs = Math.max(500, options?.reconnectMs ?? 1500);
  let closed = false;
  let ws: WebSocket | null = null;
  let timer: number | null = null;

  const connect = () => {
    if (closed) return;

    ws = new WebSocket(resolveWsUrl());
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as LiveMessage;
        if (msg && typeof msg.event === 'string') subscriber(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (closed) return;
      timer = window.setTimeout(connect, reconnectMs);
    };

    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        // no-op
      }
    };
  };

  connect();

  return () => {
    closed = true;
    if (timer) window.clearTimeout(timer);
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  };
}
