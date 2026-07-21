import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

function apiRequest(url: string, origin?: string): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: origin ? { origin } : {},
  });
}

describe('proxy CORS origin check', () => {
  it('allows same-origin requests from any custom domain', async () => {
    // Regression: custom domains (tatttester.com etc.) 403'd on every API
    // call because same-origin browser POSTs carry an Origin header.
    const res = await proxy(
      apiRequest('https://tatttester.com/api/v1/generate', 'https://tatttester.com')
    );
    expect(res.status).not.toBe(403);
  });

  it('allows *.vercel.app origins', async () => {
    const res = await proxy(
      apiRequest('https://tatt-app.vercel.app/api/v1/generate', 'https://tatt-app.vercel.app')
    );
    expect(res.status).not.toBe(403);
  });

  it('allows requests without an Origin header (curl, server-to-server)', async () => {
    const res = await proxy(apiRequest('https://tatttester.com/api/v1/generate'));
    expect(res.status).not.toBe(403);
  });

  it('still blocks cross-origin requests from unknown domains', async () => {
    const res = await proxy(
      apiRequest('https://tatttester.com/api/v1/generate', 'https://evil.example.com')
    );
    expect(res.status).toBe(403);
  });
});
