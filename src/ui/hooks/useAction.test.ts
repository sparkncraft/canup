import { describe, expect, vi } from 'vitest';
import { test as baseTest } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useAction } from '../hooks/useAction.js';
import { runAction } from '../internal/api-client.js';
import { queryClient, creditKey } from '../internal/query.js';
import { CanupError } from '../internal/errors.js';
import type { CreditBalance } from '../internal/types.js';

vi.mock('../internal/api-client.js', () => ({
  runAction: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
const mockRunAction = vi.mocked(runAction);

const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    queryClient.clear();
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('useAction', () => {
  test('returns { execute, loading: false, error: null } initially', () => {
    const { result } = renderHook(() => useAction('my-action'));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.execute).toBe('function');
  });

  test('loading becomes true during execution, false after', async () => {
    let resolveAction!: (value: { result: unknown; durationMs: number }) => void;
    mockRunAction.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    const { result } = renderHook(() => useAction('my-action'));

    let executePromise: Promise<unknown>;
    act(() => {
      executePromise = result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveAction({ result: 'done', durationMs: 42 });
      await executePromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  test('execute(params) calls runAction(action, params) and returns result', async () => {
    const mockResult = { result: { imageUrl: 'https://example.com/img.png' }, durationMs: 150 };
    mockRunAction.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useAction('my-action'));

    let actionResult: { result: unknown; durationMs: number };
    await act(async () => {
      actionResult = await result.current.execute({ prompt: 'hello' });
    });

    expect(mockRunAction).toHaveBeenCalledWith('my-action', { prompt: 'hello' });
    expect(actionResult!).toEqual(mockResult);
  });

  test('on success with credits, queryClient.setQueryData is called with creditKey and balance', async () => {
    const credits: CreditBalance = {
      subscribed: false,
      quota: 10,
      used: 1,
      remaining: 9,
      resetAt: null,
      interval: 'monthly',
      email: null,
      subscribeUrl: null,
    };
    mockRunAction.mockResolvedValue({ result: 'ok', durationMs: 10, credits });

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      await result.current.execute();
    });

    expect(setQueryDataSpy).toHaveBeenCalledWith(creditKey('my-action'), credits);
  });

  test('on success without credits, queryClient.setQueryData is NOT called', async () => {
    mockRunAction.mockResolvedValue({ result: 'ok', durationMs: 10 });

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      await result.current.execute();
    });

    expect(setQueryDataSpy).not.toHaveBeenCalled();
  });

  test('on CanupError, error is set to the CanupError instance', async () => {
    const error = new CanupError('ACTION_NOT_FOUND', 'Action not found');
    mockRunAction.mockRejectedValue(error);

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      try {
        await result.current.execute();
      } catch {
        // expected -- mutateAsync re-throws
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(CanupError);
    });
    expect(result.current.error!.type).toBe('ACTION_NOT_FOUND');
  });

  test('on non-CanupError, error is wrapped in CanupError("NETWORK_ERROR")', async () => {
    mockRunAction.mockRejectedValue(new Error('Network timeout'));

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      try {
        await result.current.execute();
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(CanupError);
    });
    expect(result.current.error!.type).toBe('NETWORK_ERROR');
    expect(result.current.error!.message).toBe('Network timeout');
  });

  test('execute() re-throws the error (mutateAsync behavior)', async () => {
    const error = new CanupError('CREDITS_EXHAUSTED', 'No credits');
    mockRunAction.mockRejectedValue(error);

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      await expect(result.current.execute()).rejects.toThrow('No credits');
    });
  });
});
