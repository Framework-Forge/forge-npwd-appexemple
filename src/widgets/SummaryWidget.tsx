import type { WidgetProps } from '../contracts';
import { useSummary } from '../hooks/useSummary';
import { useLocale } from '../i18n';
import '../styles.css';

export function SummaryWidget({ width, height }: WidgetProps) {
  const { data, loading, error } = useSummary();
  const { text, locale } = useLocale();
  return <div className={`forge-example-widget ${height > 1 ? 'forge-example-widget-tall' : ''}`}>
    <div className="forge-example-kicker">FORGE · {text.summary}</div>
    <strong>{loading ? '…' : error ? '—' : data?.online}</strong>
    <span>{error ? text.unavailable : text.online}</span>
    {height > 1 && data && <small>{text.updated}: {new Date(data.updatedAt * 1000).toLocaleTimeString(locale)}</small>}
    {width >= 4 && <span className="forge-example-widget-dot" aria-hidden="true" />}
  </div>;
}
