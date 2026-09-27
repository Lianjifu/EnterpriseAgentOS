import { describe, expect, it } from 'vitest';
import { apiBaseURL, isDemoApiMode } from './api-mode';

describe('api-mode', () => {
  it('defaults to real API (demo opt-in only)', () => {
    expect(isDemoApiMode()).toBe(false);
  });

  it('apiBaseURL uses same-origin proxy in DEV for loopback bases', () => {
    expect(typeof apiBaseURL()).toBe('string');
    expect(apiBaseURL()).toBe('');
  });
});
