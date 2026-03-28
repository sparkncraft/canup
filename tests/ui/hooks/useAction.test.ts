// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAction } from '../../../src/ui/hooks/useAction.js';
import { runAction } from '../../../src/ui/internal/api-client.js';
import { creditStore } from '../../../src/ui/internal/credit-store.js';
import { CanupError } from '../../../src/ui/internal/errors.js';

vi.mock('../../../src/ui/internal/api-client.js', () => ({
  runAction: vi.fn(),
}));
vi.mock('../../../src/ui/internal/credit-store.js', () => ({
  creditStore: {
    setCredits: vi.fn(),
    getSnapshot: vi.fn().mockReturnValue(new Map()),
  },
}));
vi.mock('../../../src/ui/internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
vi.mock('@canva/user', () => ({
  auth: { getCanvaUserToken: vi.fn() },
}));

const mockRunAction = vi.mocked(runAction);
const mockSetCredits = vi.mocked(creditStore.setCredits);

describe('useAction', () => {
  it('returns { execute, loading: false, error: null } initially', () => {
    const { result } = renderHook(() => useAction('my-action'));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.execute).toBe('function');
  });

  it('loading becomes true during execution, false after completion', async () => {
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

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveAction({ result: 'done', durationMs: 42 });
      await executePromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('execute(params) calls runAction(action, params) and returns result', async () => {
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

  it('on success with credits, creditStore.setCredits is called with server data', async () => {
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

    expect(mockSetCredits).toHaveBeenCalledWith('my-action', credits);
  });

  it('on success without credits, creditStore is not modified', async () => {
    mockRunAction.mockResolvedValue({ result: 'ok', durationMs: 10 });

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      await result.current.execute();
    });

    expect(mockSetCredits).not.toHaveBeenCalled();
  });

  it('on other CanupError (ACTION_NOT_FOUND), error is set and creditStore is NOT modified', async () => {
    const error = new CanupError('ACTION_NOT_FOUND', 'Action not found');
    mockRunAction.mockRejectedValue(error);

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      try {
        await result.current.execute();
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe(error);
    expect(mockSetCredits).not.toHaveBeenCalled();
  });

  it('error is cleared on next successful execution', async () => {
    const error = new CanupError('ACTION_NOT_FOUND', 'Action not found');
    mockRunAction.mockRejectedValueOnce(error);
    mockRunAction.mockResolvedValueOnce({ result: 'ok', durationMs: 10 });

    const { result } = renderHook(() => useAction('my-action'));

    await act(async () => {
      try {
        await result.current.execute();
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe(error);

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBeNull();
  });

  it('concurrent execute calls do not corrupt loading state', async () => {
    let resolve1!: (v: { result: unknown; durationMs: number }) => void;
    let resolve2!: (v: { result: unknown; durationMs: number }) => void;

    mockRunAction
      .mockReturnValueOnce(
        new Promise((r) => {
          resolve1 = r;
        }),
      )
      .mockReturnValueOnce(
        new Promise((r) => {
          resolve2 = r;
        }),
      );

    const { result } = renderHook(() => useAction('my-action'));

    let p1: Promise<unknown>, p2: Promise<unknown>;
    act(() => {
      p1 = result.current.execute();
      p2 = result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve1({ result: 'first', durationMs: 10 });
      await p1!;
    });

    // Second call still in progress
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve2({ result: 'second', durationMs: 20 });
      await p2!;
    });

    expect(result.current.loading).toBe(false);
  });
});
