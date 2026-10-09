export const RESOURCE_NAME = 'forge-npwd-appexemple';
export const APP_ID = RESOURCE_NAME;
export const APP_PATH = `/${APP_ID}`;
export const SUMMARY_CALLBACK = 'getSummary';
export const UPDATED_EVENT = 'summaryUpdated';

export interface Summary {
  online: number;
  updatedAt: number;
  service: 'available';
}
export type NuiResult<T> = { ok: true; data: T } | { ok: false; error: string };
export interface WidgetProps { width: number; height: number }
