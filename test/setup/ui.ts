// Setup for UI tests (jsdom environment).
// Initializes Canva SDK test environment and registers shared mocks.

import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { TestAppI18nProvider } from '@canva/app-i18n-kit';
import { TestAppUiProvider } from '@canva/app-ui-kit';
import { initTestEnvironment as initUser } from '@canva/user/test';
import { initTestEnvironment as initPlatform } from '@canva/platform/test';

// Inject Canva fake clients into window.canva_sdk.
// Acts as a safety net for tests that import @canva/* without explicit vi.mock() overrides.
initUser();
initPlatform();

/** Render with full Canva provider stack: i18n + UI. */
export function renderWithCanva(ui: ReactElement) {
  return render(
    createElement(
      TestAppI18nProvider,
      null,
      createElement(TestAppUiProvider, { enableAnimations: false, children: ui }),
    ),
  );
}
