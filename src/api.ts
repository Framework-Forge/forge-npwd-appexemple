import { RESOURCE_NAME, SUMMARY_CALLBACK, type NuiResult, type Summary } from './contracts';

export const isBrowserPreview = () => !('invokeNative' in window);

// The app executes inside the PHONE's document. GetParentResourceName would
// identify forge-npwd here, not this external app. Use the explicit app name.
export async function fetchNui<T>(event: string, data: unknown = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://${RESOURCE_NAME}/${event}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return await response.json() as T;
  } finally { window.clearTimeout(timeout); }
}

let pending: Promise<Summary> | null = null;
let cached: Summary | null = null;
let cachedUntil = 0;
export async function getSummary(): Promise<Summary> {
  if (isBrowserPreview()) return { online: 42, updatedAt: Math.floor(Date.now() / 1000), service: 'available' };
  // App + several widget instances can mount together. Share one read rather
  // than multiplying requests and triggering the server's rate limit.
  if (cached && cachedUntil > Date.now()) return cached;
  if (pending) return pending;
  pending = (async () => {
    const result = await fetchNui<NuiResult<Summary>>(SUMMARY_CALLBACK);
    if (!result.ok) throw new Error(result.error);
    cached = result.data; cachedUntil = Date.now() + 1500;
    return result.data;
  })().finally(() => { pending = null; });
  return pending;
}
