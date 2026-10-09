import React from 'react';
import ReactDOM from 'react-dom';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { APP_PATH } from './contracts';
import { isBrowserPreview } from './api';
// In game the PHONE mounts the federated app. Do not mount a second UI in the
// resource's own iframe; that iframe exists to serve callbacks and assets only.
if (isBrowserPreview()) {
  ReactDOM.render(
    <React.StrictMode><div style={{ width: 390, height: 780, margin: '30px auto', overflow: 'hidden', borderRadius: 28 }}><MemoryRouter initialEntries={[APP_PATH]}><App/></MemoryRouter></div></React.StrictMode>,
    document.getElementById('root'),
  );
}
