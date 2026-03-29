import '@canva/app-ui-kit/styles.css';
import type { DesignEditorIntent } from '@canva/intents/design';
import { AppI18nProvider } from '@canva/app-i18n-kit';
import { AppUiProvider } from '@canva/app-ui-kit';
import { createRoot } from 'react-dom/client';
import { App } from './app';

function render() {
  const root = createRoot(document.getElementById('root') as Element);
  root.render(
    <AppI18nProvider>
      <AppUiProvider>
        <App />
      </AppUiProvider>
    </AppI18nProvider>,
  );
}

const designEditor: DesignEditorIntent = { render };
export default designEditor;

if (module.hot) {
  module.hot.accept('./app', render);
}
