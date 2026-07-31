// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';

const replace = vi.fn();
let mockPathname = '/studio';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => mockPathname,
}));

const mockAuth = { isAuthenticated: false, loading: true };

vi.mock('@/components/AuthProvider', () => ({
  useAuthContext: () => mockAuth,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    replace.mockClear();
    mockPathname = '/studio';
    mockAuth.isAuthenticated = false;
    mockAuth.loading = true;
    window.history.replaceState(null, '', '/studio');
  });

  it('shows the styled hold state (not children) while auth is resolving', () => {
    render(
      <ProtectedRoute>
        <div>secret forge</div>
      </ProtectedRoute>,
    );
    expect(screen.queryByText('secret forge')).toBeNull();
    expect(document.body.textContent).toContain('Checking');
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects signed-out users on an unknown device to /signup (issue #101)', () => {
    mockAuth.loading = false;
    window.localStorage.removeItem('tatt:known-user');
    render(
      <ProtectedRoute>
        <div>secret forge</div>
      </ProtectedRoute>,
    );
    expect(screen.queryByText('secret forge')).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      `/signup?redirect=${encodeURIComponent('/studio')}`,
    );
  });

  it('redirects signed-out users on a known device to /login', () => {
    mockAuth.loading = false;
    window.localStorage.setItem('tatt:known-user', '1');
    render(
      <ProtectedRoute>
        <div>secret forge</div>
      </ProtectedRoute>,
    );
    expect(replace).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent('/studio')}`,
    );
    window.localStorage.removeItem('tatt:known-user');
  });

  it('preserves the query string in the return path', () => {
    mockAuth.loading = false;
    mockPathname = '/smart-match';
    window.history.replaceState(null, '', '/smart-match?ds=session-1');
    window.localStorage.removeItem('tatt:known-user');
    render(
      <ProtectedRoute>
        <div>smart match</div>
      </ProtectedRoute>,
    );
    expect(replace).toHaveBeenCalledWith(
      `/signup?redirect=${encodeURIComponent('/smart-match?ds=session-1')}`,
    );
  });

  it('renders children for signed-in users without redirecting', () => {
    mockAuth.loading = false;
    mockAuth.isAuthenticated = true;
    render(
      <ProtectedRoute>
        <div>secret forge</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('secret forge')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
