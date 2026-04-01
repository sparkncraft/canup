import { describe, it, expect, vi, beforeEach } from 'vitest';

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

beforeEach(() => {
  mockSpinnerInst.text = '';
  mockSpinnerInst.start.mockReturnValue(mockSpinnerInst);
  mockOra.mockReturnValue(mockSpinnerInst);
});

describe('createSpinner', () => {
  it('calls ora and starts the spinner', () => {
    createSpinner('Loading...');
    expect(mockOra).toHaveBeenCalledWith(expect.objectContaining({ text: 'Loading...' }));
    expect(mockSpinnerInst.start).toHaveBeenCalled();
  });

  it('returns an object with update, succeed, and fail', () => {
    const spin = createSpinner('Working...');
    expect(typeof spin.update).toBe('function');
    expect(typeof spin.succeed).toBe('function');
    expect(typeof spin.fail).toBe('function');
  });

  it('update() sets spinner text', () => {
    const spin = createSpinner('Step 1');
    spin.update('Step 2');
    expect(mockSpinnerInst.text).toBe('Step 2');
  });

  it('succeed() calls ora succeed with text containing duration', () => {
    const spin = createSpinner('Deploying');
    spin.succeed('Deployed');
    expect(mockSpinnerInst.succeed).toHaveBeenCalledWith(expect.stringContaining('Deployed'));
  });

  it('fail() calls ora fail with the text', () => {
    const spin = createSpinner('Deploying');
    spin.fail('Deploy failed');
    expect(mockSpinnerInst.fail).toHaveBeenCalledWith('Deploy failed');
  });
});

describe('withSpinner', () => {
  it('returns function result on success and calls succeed', async () => {
    const result = await withSpinner('Loading', async () => 'value');
    expect(result).toBe('value');
    expect(mockSpinnerInst.succeed).toHaveBeenCalled();
  });

  it('calls fail and re-throws on error', async () => {
    const err = new Error('boom');
    await expect(withSpinner('Loading', async () => { throw err; })).rejects.toBe(err);
    expect(mockSpinnerInst.fail).toHaveBeenCalled();
  });

  it('uses custom successText when provided', async () => {
    await withSpinner('Loading', async () => 'ok', 'All done');
    expect(mockSpinnerInst.succeed).toHaveBeenCalledWith(expect.stringContaining('All done'));
  });

  it('uses original text as succeed text when no successText provided', async () => {
    await withSpinner('Fetching data', async () => 'result');
    expect(mockSpinnerInst.succeed).toHaveBeenCalledWith(expect.stringContaining('Fetching data'));
  });
});
