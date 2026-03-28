// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { ActionButton } from '../../../src/ui/components/ActionButton.js';
import { useAction } from '../../../src/ui/hooks/useAction.js';
import { useCredits } from '../../../src/ui/hooks/useCredits.js';
import { CanupError } from '../../../src/ui/internal/errors.js';

vi.mock('@canva/app-ui-kit', () => ({
  Button: vi.fn(
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      disabled?: boolean;
      loading?: boolean;
      variant?: string;
      stretch?: boolean;
      onClick?: () => void;
    }) =>
      React.createElement(
        'button',
        {
          'data-testid': 'canva-button',
          disabled: props.disabled ?? undefined,
          'data-loading': String(props.loading),
          'data-variant': props.variant,
          'data-stretch': String(props.stretch),
          onClick: props.onClick,
        },
        children,
      ),
  ),
}));

vi.mock('../../../src/ui/hooks/useAction.js', () => ({
  useAction: vi.fn(),
}));
vi.mock('../../../src/ui/hooks/useCredits.js', () => ({
  useCredits: vi.fn(),
}));
vi.mock('../../../src/ui/internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
vi.mock('@canva/user', () => ({
  auth: { getCanvaUserToken: vi.fn() },
}));

const mockUseAction = vi.mocked(useAction);
const mockUseCredits = vi.mocked(useCredits);

describe('ActionButton', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockUseAction.mockReturnValue({
      execute: vi.fn().mockResolvedValue({ result: 'ok', durationMs: 10 }),
      loading: false,
      error: null,
    });
    mockUseCredits.mockReturnValue({
      data: {
        subscribed: false,
        quota: 100,
        used: 10,
        remaining: 90,
        resetAt: null,
        interval: 'monthly',
        email: null,
        subscribeUrl: null,
      },
      loading: false,
      exhausted: false,
      subscribeUrl: null,
      refresh: vi.fn(),
    });
  });

  it('renders Canva Button with children text', () => {
    render(
      <ActionButton action="my-action" variant="primary">
        Generate
      </ActionButton>,
    );

    const btn = screen.getByTestId('canva-button');
    expect(btn.textContent).toBe('Generate');
  });

  it('calls execute(params) on click', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ result: 'done', durationMs: 42 });
    mockUseAction.mockReturnValue({ execute: mockExecute, loading: false, error: null });

    render(
      <ActionButton action="my-action" variant="primary" params={{ prompt: 'hello' }}>
        Go
      </ActionButton>,
    );

    fireEvent.click(screen.getByTestId('canva-button'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ prompt: 'hello' });
    });
  });

  it('shows loading=true during execution (Button loading prop)', () => {
    mockUseAction.mockReturnValue({
      execute: vi.fn().mockResolvedValue({ result: 'ok', durationMs: 10 }),
      loading: true,
      error: null,
    });

    render(
      <ActionButton action="my-action" variant="primary">
        Go
      </ActionButton>,
    );

    const btn = screen.getByTestId('canva-button');
    expect(btn.getAttribute('data-loading')).toBe('true');
  });

  it('disables when credits exhausted', () => {
    mockUseCredits.mockReturnValue({
      data: {
        subscribed: false,
        quota: 10,
        used: 10,
        remaining: 0,
        resetAt: null,
        interval: 'monthly',
        email: null,
        subscribeUrl: null,
      },
      loading: false,
      exhausted: true,
      subscribeUrl: null,
      refresh: vi.fn(),
    });

    render(
      <ActionButton action="my-action" variant="primary">
        Go
      </ActionButton>,
    );

    const btn = screen.getByTestId('canva-button');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('calls onResult callback with { result, durationMs } on success', async () => {
    const mockResult = { result: { imageUrl: 'https://example.com/img.png' }, durationMs: 150 };
    const mockExecute = vi.fn().mockResolvedValue(mockResult);
    mockUseAction.mockReturnValue({ execute: mockExecute, loading: false, error: null });
    const onResult = vi.fn();

    render(
      <ActionButton action="my-action" variant="primary" onResult={onResult}>
        Go
      </ActionButton>,
    );

    fireEvent.click(screen.getByTestId('canva-button'));

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(mockResult);
    });
  });

  it('calls onError callback with CanupError on failure', async () => {
    const error = new CanupError('CREDITS_EXHAUSTED', 'Credits exhausted');
    const mockExecute = vi.fn().mockRejectedValue(error);
    mockUseAction.mockReturnValue({ execute: mockExecute, loading: false, error: null });
    const onError = vi.fn();

    render(
      <ActionButton action="my-action" variant="primary" onError={onError}>
        Go
      </ActionButton>,
    );

    fireEvent.click(screen.getByTestId('canva-button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('forwards variant, stretch, and other Canva Button props', () => {
    render(
      <ActionButton action="my-action" variant="secondary" stretch>
        Go
      </ActionButton>,
    );

    const btn = screen.getByTestId('canva-button');
    expect(btn.getAttribute('data-variant')).toBe('secondary');
    expect(btn.getAttribute('data-stretch')).toBe('true');
  });
});
