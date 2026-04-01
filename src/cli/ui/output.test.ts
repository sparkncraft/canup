import { describe, it, expect, vi } from 'vitest';
import { success, error, hint, info, label, warn, dim, formatTable } from './output.js';

describe('output helpers', () => {
  describe('stdout routing (console.log)', () => {
    it('success() writes to stdout', () => {
      using spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      success('done');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('done'));
    });

    it('info() writes to stdout', () => {
      using spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      info('update available');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('update available'));
    });

    it('label() writes key and value to stdout', () => {
      using spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      label('Email', 'test@example.com');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Email'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    });

    it('warn() writes to stdout', () => {
      using spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      warn('be careful');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('be careful'));
    });
  });

  describe('stderr routing (console.error)', () => {
    it('error() writes to stderr', () => {
      using spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      error('something broke');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('something broke'));
    });

    it('hint() writes to stderr', () => {
      using spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      hint('try this instead');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('try this instead'));
    });
  });

  describe('pure functions', () => {
    it('dim() returns a non-empty string', () => {
      const result = dim('faded text');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formatTable() returns header and data rows', () => {
      const result = formatTable(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']]);
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('Alice');
      expect(result).toContain('30');
      expect(result).toContain('Bob');
      expect(result).toContain('25');
    });

    it('formatTable() with empty rows returns header only', () => {
      const result = formatTable(['Name', 'Age'], []);
      const lines = result.split('\n');
      expect(lines.length).toBe(1);
      expect(result).toContain('Name');
      expect(result).toContain('Age');
    });
  });
});
