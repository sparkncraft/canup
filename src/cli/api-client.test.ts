import { describe, it, expect } from 'vitest';
import { parsePackageSpecs, formatBytes } from './api-client.js';

describe('parsePackageSpecs', () => {
  it('parses npm package with version', () => {
    const result = parsePackageSpecs(['express@4.18.2'], 'nodejs');
    expect(result).toEqual([{ name: 'express', version: '4.18.2' }]);
  });

  it('parses npm scoped package with version', () => {
    const result = parsePackageSpecs(['@types/node@20'], 'nodejs');
    expect(result).toEqual([{ name: '@types/node', version: '20' }]);
  });

  it('parses pip package with == version', () => {
    const result = parsePackageSpecs(['requests==2.31.0'], 'python');
    expect(result).toEqual([{ name: 'requests', version: '2.31.0' }]);
  });

  it('parses package without version', () => {
    const result = parsePackageSpecs(['flask'], 'python');
    expect(result).toEqual([{ name: 'flask' }]);
  });

  it('parses npm package without version', () => {
    const result = parsePackageSpecs(['lodash'], 'nodejs');
    expect(result).toEqual([{ name: 'lodash' }]);
  });

  it('parses multiple packages at once', () => {
    const result = parsePackageSpecs(['express@4.18.2', 'cors@2.8.5', 'dotenv'], 'nodejs');
    expect(result).toEqual([
      { name: 'express', version: '4.18.2' },
      { name: 'cors', version: '2.8.5' },
      { name: 'dotenv' },
    ]);
  });

  it('parses multiple pip packages', () => {
    const result = parsePackageSpecs(['requests==2.31.0', 'flask'], 'python');
    expect(result).toEqual([{ name: 'requests', version: '2.31.0' }, { name: 'flask' }]);
  });
});

describe('formatBytes', () => {
  it('formats bytes (< 1024)', () => {
    expect(formatBytes(500)).toBe('500B');
  });

  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0B');
  });

  it('formats kilobytes', () => {
    const result = formatBytes(2048);
    expect(result).toContain('KB');
    expect(result).toBe('2.0KB');
  });

  it('formats megabytes', () => {
    const result = formatBytes(5 * 1024 * 1024);
    expect(result).toContain('MB');
    expect(result).toBe('5.0MB');
  });

  it('formats boundary at exactly 1024 bytes', () => {
    expect(formatBytes(1024)).toBe('1.0KB');
  });
});
