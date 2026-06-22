import { afterEach, describe, expect, test } from 'vitest';
import { Text } from '@canva/app-ui-kit';
import { screen, cleanup } from '@testing-library/react';
import { renderWithCanva } from '#test/setup/ui.js';
import { MonetizationAlert } from './MonetizationAlert.js';

afterEach(cleanup);

describe('MonetizationAlert', () => {
  test('renders the attributed title and resolution content', () => {
    renderWithCanva(
      <MonetizationAlert title="You're out of Acme credits">
        <Text>Credits refresh Jun 1, 2026</Text>
      </MonetizationAlert>,
    );

    expect(screen.getByText("You're out of Acme credits")).toBeTruthy();
    expect(screen.getByText('Credits refresh Jun 1, 2026')).toBeTruthy();
  });
});
