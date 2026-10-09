import { useEffect, useState } from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import { APP_PATH } from './contracts';
import { fetchNui, isBrowserPreview } from './api';
import type { NuiResult } from './contracts';
import { useSummary } from './hooks/useSummary';
import { locales, useLocale } from './i18n';
import { SummaryWidget } from './widgets/SummaryWidget';
import { ClockWidget } from './widgets/ClockWidget';
import './styles.css';

export default function App() {
  const { locale, text, setLocale } = useLocale();
  const { data, error, loading, refresh } = useSummary();
  const [notice, setNotice] = useState('');
  useEffect(() => { setNotice(''); }, [locale]);
  const notify = async () => {
    if (isBrowserPreview()) { setNotice(text.notificationPreview); return; }
    try {
      const result = await fetchNui<NuiResult<boolean>>('sendDemoNotification', { content: text.notificationText, title: text.title });
      setNotice(result.ok ? text.notificationSent : `${text.unavailable} (${result.error})`);
    } catch { setNotice(text.unavailable); }
  };
  return <div className="forge-example-app">
    <header><span className="forge-example-kicker">FORGE NPWD</span><h1>{text.title}</h1><p>{text.subtitle}</p>
      <label><span className="forge-example-sr">{text.language}</span><select aria-label={text.language} value={locale} onChange={e => setLocale(e.target.value as typeof locale)}>{locales.map(code => <option key={code}>{code}</option>)}</select></label>
    </header>
    <nav><NavLink exact to={APP_PATH}>{text.overview}</NavLink><NavLink to={`${APP_PATH}/guide`}>{text.guide}</NavLink></nav>
    <main><Switch>
      <Route path={`${APP_PATH}/guide`}><h2>{text.widgets}</h2><p>{text.instructions}</p><p>{text.developer}</p><code>forge-npwd.config.ts → homeWidgets</code></Route>
      <Route path={APP_PATH}>
        <span className="forge-example-preview">{isBrowserPreview() ? text.browser : text.live}</span>
        <section className="forge-example-card" aria-live="polite"><h2>{text.online}</h2><strong>{loading ? '…' : error ? '—' : data?.online}</strong>
          {error && <p role="alert">{text.unavailable} ({error})</p>}
          {data && <p>{text.updated}: {new Date(data.updatedAt * 1000).toLocaleTimeString(locale)}</p>}
          <div className="forge-example-actions"><button type="button" onClick={() => void refresh()}>{error ? text.retry : text.refresh}</button>
          <button type="button" onClick={() => void notify()}>{text.notify}</button></div><p role="status">{notice}</p>
        </section>
        <h2>{text.widgets}</h2><div className="forge-example-widget-preview"><SummaryWidget width={4} height={2}/><ClockWidget width={2} height={2}/></div>
      </Route>
    </Switch></main>
  </div>;
}
