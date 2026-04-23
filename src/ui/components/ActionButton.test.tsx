import { describe, expect, test as baseTest, vi } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { renderWithCanva } from '#test/setup/ui.js';
import { ActionButton } from './ActionButton.js';
import { useAction } from '../hooks/use-action.js';
import { useCredits } from '../hooks/use-credits.js';
import { CanupError } from '../errors.js';

vi.mock('../hooks/use-action.js', () => ({
  useAction: vi.fn(),
}));
vi.mock('../hooks/use-credits.js', () => ({
  useCredits: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
const mockUseAction = vi.mocked(useAction);
const mockUseCredits = vi.mocked(useCredits);

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
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
      error: null,
      refresh: vi.fn(),
    });
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('ActionButton', () => {
  test('renders Canva Button with children text', () => {
    renderWithCanva(
      <ActionButton action="my-action" variant="primary">
        Generate
      </ActionButton>,
    );

    expect(screen.getByRole('button', { name: 'Generate' })).toBeTruthy();
  });

  test('calls execute(params) on click', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ result: 'done', durationMs: 42 });
    mockUseAction.mockReturnValue({ execute: mockExecute, loading: false, error: null });

    renderWithCanva(
      <ActionButton action="my-action" variant="primary" params={{ prompt: 'hello' }}>
        Go
      </ActionButton>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ prompt: 'hello' });
    });
  });

  test('marks button as aria-disabled during loading', () => {
    mockUseAction.mockReturnValue({
      execute: vi.fn().mockResolvedValue({ result: 'ok', durationMs: 10 }),
      loading: true,
      error: null,
    });

    renderWithCanva(
      <ActionButton action="my-action" variant="primary">
        Go
      </ActionButton>,
    );

    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe('true');
  });

  test('marks button as aria-disabled when credits exhausted', () => {
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
      error: null,
      refresh: vi.fn(),
    });

    renderWithCanva(
      <ActionButton action="my-action" variant="primary">
        Go
      </ActionButton>,
    );

    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe('true');
  });

  test('calls onResult callback with { result, durationMs } on success', async () => {
    const mockResult = { result: { imageUrl: 'https://example.com/img.png' }, durationMs: 150 };
    const mockExecute = vi.fn().mockResolvedValue(mockResult);
    mockUseAction.mockReturnValue({ execute: mockExecute, loading: false, error: null });
    const onResult = vi.fn();

    renderWithCanva(
      <ActionButton action="my-action" variant="primary" onResult={onResult}>
        Go
      </ActionButton>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(mockResult);
    });
  });

  test('calls onError callback with CanupError on failure', async () => {
    const error = new CanupError('CREDITS_EXHAUSTED', 'Credits exhausted');
    const mockExecute = vi.fn().mockRejectedValue(error);
    mockUseAction.mockReturnValue({ execute: mockExecute, loading: false, error: null });
    const onError = vi.fn();

    renderWithCanva(
      <ActionButton action="my-action" variant="primary" onError={onError}>
        Go
      </ActionButton>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  test('renders with variant and stretch props', () => {
    renderWithCanva(
      <ActionButton action="my-action" variant="secondary" stretch>
        Go
      </ActionButton>,
    );

    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });
});
