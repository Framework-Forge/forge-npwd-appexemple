import App from './src/App';
import { AppIcon, NotificationIcon } from './src/Icon';
import { APP_ID, APP_PATH } from './src/contracts';
import { SummaryWidget } from './src/widgets/SummaryWidget';
import { ClockWidget } from './src/widgets/ClockWidget';

// The current phone loader calls this factory WITHOUT settings.
// Keep the factory zero-argument; language is handled by the app itself.
export default () => ({
  id: APP_ID, path: APP_PATH, nameLocale: 'Forge Example',
  color: '#ffffff', backgroundColor: '#131b29',
  icon: AppIcon, notificationIcon: NotificationIcon, app: App,
  homeWidgets: [
    {
      id: 'summary', name: 'Forge · Server', description: 'Live server summary',
      sizes: [
        { width: 2, height: 1, label: '2×1' },
        { width: 4, height: 1, label: '4×1' },
        { width: 4, height: 2, label: '4×2' },
      ],
      Component: SummaryWidget, path: APP_PATH,
    },
    {
      id: 'clock', name: 'Forge · Clock', description: 'Local time, no network request',
      sizes: [{ width: 2, height: 1, label: '2×1' }, { width: 2, height: 2, label: '2×2' }],
      Component: ClockWidget, path: APP_PATH,
    },
  ],
});
