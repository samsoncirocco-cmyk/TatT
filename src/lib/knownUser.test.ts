import { beforeEach, describe, expect, it } from 'vitest';
import { authDoorHref, isKnownUser, markKnownUser } from './knownUser';

describe('knownUser', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('treats a brand-new device as unknown', () => {
    expect(isKnownUser()).toBe(false);
  });

  it('remembers the device once marked, across sign-out (nothing unsets it)', () => {
    markKnownUser();
    expect(isKnownUser()).toBe(true);
  });

  it('routes an unknown device to signup', () => {
    expect(authDoorHref()).toBe('/signup');
  });

  it('routes a known device to login', () => {
    markKnownUser();
    expect(authDoorHref()).toBe('/login');
  });

  it('carries the redirect destination, encoded', () => {
    expect(authDoorHref('/designs/abc?x=1')).toBe(
      `/signup?redirect=${encodeURIComponent('/designs/abc?x=1')}`
    );
  });
});
