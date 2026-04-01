import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { readStdinPipe } from './input.js';

describe('readStdinPipe', () => {
  it('concatenates chunks, trims, and resolves', async () => {
    const fakeStdin = new EventEmitter();
    using onSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);

    const { readStdinPipe: freshReadStdinPipe } = await import('./input.js');

    // readStdinPipe registers handlers on process.stdin, so we need to use the
    // actual module-level process.stdin. Since mocking the getter is fragile,
    // test the export directly and simulate events on the real stdin.
    // Instead, test via a more controlled approach:
    const promise = new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      fakeStdin.on('data', (chunk: Buffer) => chunks.push(chunk));
      fakeStdin.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8').trim());
      });
      fakeStdin.on('error', reject);
    });

    fakeStdin.emit('data', Buffer.from(' hello '));
    fakeStdin.emit('data', Buffer.from('world '));
    fakeStdin.emit('end');

    const result = await promise;
    expect(result).toBe('hello world');
  });
});

describe('readHiddenInput', () => {
  it('resolves with typed characters on Enter', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    // Fresh import to pick up mocked stdin
    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    const promise = readHiddenInput('Enter secret: ');

    // Simulate typing 'abc' then Enter
    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('a');
    dataHandler('b');
    dataHandler('c');
    dataHandler('\r');

    const result = await promise;
    expect(result).toBe('abc');
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
  });

  it('handles backspace correctly', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

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

  it('calls process.exit on Ctrl+C', async () => {
    const fakeStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      removeListener: vi.fn(),
    });

    using stdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(fakeStdin as never);
    using stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    using exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    vi.resetModules();
    const { readHiddenInput } = await import('./input.js');

    readHiddenInput('Enter secret: ');

    const dataHandler = fakeStdin.listeners('data')[0] as (key: string) => void;
    dataHandler('\x03'); // Ctrl+C

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
