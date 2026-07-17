import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));

import { verifyCloudTaskRequest } from './cloud-tasks-auth';

describe('verifyCloudTaskRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    verifyIdToken.mockReset();
  });

  it('fails closed when task identity configuration is missing', async () => {
    const request = new NextRequest('https://example.com/api/v1/tasks/generate', {
      headers: { Authorization: 'Bearer token' },
    });

    await expect(verifyCloudTaskRequest(request)).resolves.toBe(false);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('accepts the configured Google service account and audience', async () => {
    vi.stubEnv('CLOUD_TASKS_AUDIENCE', 'https://example.com/api/v1/tasks/generate');
    vi.stubEnv('TASK_SERVICE_ACCOUNT', 'tasks@example.iam.gserviceaccount.com');
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'tasks@example.iam.gserviceaccount.com',
        email_verified: true,
      }),
    });
    const request = new NextRequest('https://example.com/api/v1/tasks/generate', {
      headers: { Authorization: 'Bearer google-signed-token' },
    });

    await expect(verifyCloudTaskRequest(request)).resolves.toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'google-signed-token',
      audience: 'https://example.com/api/v1/tasks/generate',
    });
  });

  it('rejects a valid token from a different service account', async () => {
    vi.stubEnv('CLOUD_TASKS_AUDIENCE', 'https://example.com/api/v1/tasks/generate');
    vi.stubEnv('TASK_SERVICE_ACCOUNT', 'tasks@example.iam.gserviceaccount.com');
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'other@example.iam.gserviceaccount.com', email_verified: true }),
    });
    const request = new NextRequest('https://example.com/api/v1/tasks/generate', {
      headers: { Authorization: 'Bearer google-signed-token' },
    });

    await expect(verifyCloudTaskRequest(request)).resolves.toBe(false);
  });

  it('accepts main\'s OIDC env var names', async () => {
    vi.stubEnv('CLOUD_TASKS_OIDC_AUDIENCE', 'https://example.com/api/v1/tasks/generate');
    vi.stubEnv('CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL', 'tasks@example.iam.gserviceaccount.com');
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'tasks@example.iam.gserviceaccount.com',
        email_verified: true,
      }),
    });
    const request = new NextRequest('https://example.com/api/v1/tasks/generate', {
      headers: { Authorization: 'Bearer google-signed-token' },
    });

    await expect(verifyCloudTaskRequest(request)).resolves.toBe(true);
  });

  it('allows local bypass only when explicitly flagged outside production', async () => {
    vi.stubEnv('ALLOW_UNAUTHENTICATED_TASKS', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    const request = new NextRequest('https://example.com/api/v1/tasks/generate');

    await expect(verifyCloudTaskRequest(request)).resolves.toBe(true);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('never honors the local bypass in production', async () => {
    vi.stubEnv('ALLOW_UNAUTHENTICATED_TASKS', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    const request = new NextRequest('https://example.com/api/v1/tasks/generate');

    await expect(verifyCloudTaskRequest(request)).resolves.toBe(false);
  });
});
