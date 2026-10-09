import { useEffect, useState } from 'react';
import type { WidgetProps } from '../contracts';
import { useLocale } from '../i18n';
import '../styles.css';
export function ClockWidget({ height }: WidgetProps) {
  const [now, setNow] = useState(() => new Date());
  const { locale, text } = useLocale();
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return <div className="forge-example-widget"><div className="forge-example-kicker">{text.clock}</div>
    <strong>{now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</strong>
    {height > 1 && <span>{now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}</span>}
  </div>;
}
