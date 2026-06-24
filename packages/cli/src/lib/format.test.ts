import { describe, test, expect } from 'vitest';
import { formatDuration } from './format.js';

describe('formatDuration', () => {
  test('renders sub-second durations in milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  test('renders one second and above with one decimal place', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(12345)).toBe('12.3s');
  });
});
