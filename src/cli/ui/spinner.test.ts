import { describe, test as baseTest, expect, vi } from 'vitest';

const { mockOra, mockSpinnerInst } = vi.hoisted(() => {
  const inst = {
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  };
  return { mockOra: vi.fn(), mockSpinnerInst: inst };
});

vi.mock('ora', () => ({ default: mockOra }));

import { createSpinner, withSpinner } from './spinner.js';

const test = baseTest.extend<{ _ora: void }>({
  _ora: [
    async ({}, use) => {
      mockSpinnerInst.text = '';
      mockSpinnerInst.start.mockReturnValue(mockSpinnerInst);
      mockOra.mockReturnValue(mockSpinnerInst);
      await use();
    },
    { auto: true },
  ],
});

describe('createSpinner', () => {
  test('calls ora and starts the spinner', () => {
    createSpinner('Loading...');
    expect(mockOra).toHaveBeenCalledWith(expect.objectContaining({ text: 'Loading...' }));
    expect(mockSpinnerInst.start).toHaveBeenCalled();
  });

  test('returns an object with update, succeed, and fail', () => {
    const spin = createSpinner('Working...');
    expect(typeof spin.update).toBe('function');
    expect(typeof spin.succeed).toBe('function');
    expect(typeof spin.fail).toBe('function');
  });

  test('update() sets spinner text', () => {
    const spin = createSpinner('Step 1');
    spin.update('Step 2');
    expect(mockSpinnerInst.text).toBe('Step 2');
  });

  test('succeed() calls ora succeed with text containing duration', () => {
    const spin = createSpinner('Deploying');
    spin.succeed('Deployed');
    expect(mockSpinnerInst.succeed).toHaveBeenCalledWith(expect.stringContaining('Deployed'));
  });

  test('succeed() formats duration as seconds when >= 1000ms', () => {
    vi.useFakeTimers();
    const spin = createSpinner('Building');
    vi.advanceTimersByTime(2500);
    spin.succeed('Built');
    expect(mockSpinnerInst.succeed).toHaveBeenCalledWith(expect.stringContaining('2.5s'));
    vi.useRealTimers();
  });

  test('fail() calls ora fail with the text', () => {
    const spin = createSpinner('Deploying');
    spin.fail('Deploy failed');
    expect(mockSpinnerInst.fail).toHaveBeenCalledWith('Deploy failed');
  });
});

describe('withSpinner', () => {
  test('returns function result on success and calls succeed', async () => {
    const result = await withSpinner('Loading', async () => 'value');
    expect(result).toBe('value');
    expect(mockSpinnerInst.succeed).toHaveBeenCalled();
  });

  test('calls fail and re-throws on error', async () => {
    const err = new Error('boom');
    await expect(
      withSpinner('Loading', async () => {
        throw err;
      }),
    ).rejects.toBe(err);
    expect(mockSpinnerInst.fail).toHaveBeenCalled();
  });

  test('uses custom successText when provided', async () => {
    await withSpinner('Loading', async () => 'ok', 'All done');
    expect(mockSpinnerInst.succeed).toHaveBeenCalledWith(expect.stringContaining('All done'));
  });

  test('uses original text as succeed text when no successText provided', async () => {
    await withSpinner('Fetching data', async () => 'result');
    expect(mockSpinnerInst.succeed).toHaveBeenCalledWith(expect.stringContaining('Fetching data'));
  });
});
