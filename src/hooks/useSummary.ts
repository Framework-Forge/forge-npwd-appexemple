import { useCallback, useEffect, useRef, useState } from 'react';
import { getSummary } from '../api';
import { APP_ID, UPDATED_EVENT, type Summary } from '../contracts';

// Widgets mount independently of App: do not rely on an App-only context.
export function useSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const result = await getSummary();
      if (alive.current) { setData(result); setError(null); }
    } catch (cause) {
      if (alive.current) { setData(null); setError(cause instanceof Error ? cause.message : 'REQUEST_FAILED'); }
    } finally { pending.current = false; if (alive.current) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true; void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    const listener = (event: MessageEvent) => {
      if (event.data?.app === APP_ID && event.data?.method === UPDATED_EVENT) void refresh();
    };
    window.addEventListener('message', listener);
    return () => { alive.current = false; window.clearInterval(timer); window.removeEventListener('message', listener); };
  }, [refresh]);
  return { data, error, loading, refresh };
}
