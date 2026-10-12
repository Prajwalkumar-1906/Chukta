import { describe, it, expect } from 'vitest';
import { APP_NAME, formatPaise, rupeesToPaise } from '@chukta/shared';

describe('Chukta Web Client Baseline', () => {
  it('loads APP_NAME constant properly', () => {
    expect(APP_NAME).toBeDefined();
    expect(typeof APP_NAME).toBe('string');
  });

  it('verifies money formatting for web UI components', () => {
    expect(formatPaise(100000)).toContain('₹1,000');
    expect(rupeesToPaise(500)).toBe(50000);
  });
});
