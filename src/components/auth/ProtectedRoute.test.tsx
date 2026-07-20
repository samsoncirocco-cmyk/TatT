// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';

const replace = vi.fn();
let mockPathname = '/generate';

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
    mockPathname = '/generate';
    mockAuth.isAuthenticated = false;
    mockAuth.loading = true;
    window.history.replaceState(null, '', '/generate');
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

  it('redirects signed-out users to /login with a return path', () => {
    mockAuth.loading = false;
    render(
      <ProtectedRoute>
        <div>secret forge</div>
      </ProtectedRoute>,
    );
    expect(screen.queryByText('secret forge')).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent('/generate')}`,
    );
  });

  it('preserves the query string in the return path', () => {
    mockAuth.loading = false;
    mockPathname = '/matches';
    window.history.replaceState(null, '', '/matches?style=blackwork');
    render(
      <ProtectedRoute>
        <div>matches</div>
      </ProtectedRoute>,
    );
    expect(replace).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent('/matches?style=blackwork')}`,
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
