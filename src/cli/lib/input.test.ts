import { describe, test, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';

describe('readStdinPipe', () => {
  test('concatenates chunks, trims, and resolves', async () => {
    const fakeStdin = new EventEmitter();
    using _spy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);

    vi.resetModules();
    const { readStdinPipe } = await import('./input.js');

    const promise = readStdinPipe();

    fakeStdin.emit('data', Buffer.from(' hello '));
    fakeStdin.emit('data', Buffer.from('world '));
    fakeStdin.emit('end');

    const result = await promise;
    expect(result).toBe('hello world');
  });

  test('rejects on stdin error', async () => {
    const fakeStdin = new EventEmitter();
    using _spy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);

    vi.resetModules();
    const { readStdinPipe } = await import('./input.js');

    const promise = readStdinPipe();

    fakeStdin.emit('error', new Error('broken pipe'));

    await expect(promise).rejects.toThrow('broken pipe');
  });
});

describe('readHiddenInput', () => {
  test('resolves with typed characters on Enter', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using _stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using _stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    const promise = readHiddenInput('Enter secret: ');

    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('a');
    dataHandler('b');
    dataHandler('c');
    dataHandler('\r');

    const result = await promise;
    expect(result).toBe('abc');
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
  });

  test('handles backspace on empty input without error', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using _stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using _stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    const promise = readHiddenInput('Enter: ');

    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('\x7f');
    dataHandler('a');
    dataHandler('\r');

    const result = await promise;
    expect(result).toBe('a');
  });

  test('handles backspace correctly', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using _stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using _stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    const promise = readHiddenInput('Enter secret: ');

    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('a');
    dataHandler('b');
    dataHandler('\x7f'); // backspace
    dataHandler('c');
    dataHandler('\r');

    const result = await promise;
    expect(result).toBe('ac');
  });

  test('calls process.exit on Ctrl+C', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using _stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using _stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    using exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    readHiddenInput('Enter secret: ');

    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('\x03'); // Ctrl+C

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('echoes * for each character and writes prompt to stderr', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using _stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    const stderrCalls: string[] = [];
    using _stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderrCalls.push(String(chunk));
      return true;
    });

    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    const promise = readHiddenInput('Password: ');

    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('x');
    dataHandler('y');
    dataHandler('\r');

    await promise;

    expect(stderrCalls[0]).toBe('Password: ');
    expect(stderrCalls.filter((c) => c === '*')).toHaveLength(2);
    expect(stderrCalls[stderrCalls.length - 1]).toBe('\n');
  });

  test('restores stdin to normal mode after completion', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using _stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using _stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    const promise = readHiddenInput('Enter: ');

    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('\r');

    await promise;

    expect(fakeStdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(fakeStdin.pause).toHaveBeenCalled();
  });
});
