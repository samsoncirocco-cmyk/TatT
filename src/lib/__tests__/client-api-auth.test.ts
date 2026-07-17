import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth: { currentUser: { getIdToken: () => Promise<string> } | null } = {
  currentUser: null,
};

vi.mock('../firebase', () => ({ auth: mockAuth }));

describe('client-api-auth', () => {
  let originalLocation: Location;

  beforeEach(() => {
    mockAuth.currentUser = null;
    originalLocation = window.location;
    // @ts-expect-error - deleting to allow reassignment in jsdom
    delete window.location;
    window.location = { ...originalLocation, href: '', pathname: '/generate', search: '?x=1' } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.resetModules();
  });

  it('redirectToSignIn navigates to /login with a returnTo param', async () => {
    const { redirectToSignIn } = await import('../client-api-auth');
    redirectToSignIn();
    expect(window.location.href).toBe('/login?returnTo=%2Fgenerate%3Fx%3D1');
  });

  it('getApiAuthHeaders redirects to sign-in and throws SignInRequiredError when there is no user', async () => {
    const { getApiAuthHeaders, SignInRequiredError } = await import('../client-api-auth');

    await expect(getApiAuthHeaders()).rejects.toBeInstanceOf(SignInRequiredError);
    expect(window.location.href).toBe('/login?returnTo=%2Fgenerate%3Fx%3D1');
  });

  it('getApiAuthHeaders returns a Bearer header and does not redirect when signed in', async () => {
    mockAuth.currentUser = { getIdToken: async () => 'test-token' };
    const { getApiAuthHeaders } = await import('../client-api-auth');

    const headers = await getApiAuthHeaders();

    expect(headers).toEqual({ Authorization: 'Bearer test-token' });
    expect(window.location.href).toBe('');
  });
});
