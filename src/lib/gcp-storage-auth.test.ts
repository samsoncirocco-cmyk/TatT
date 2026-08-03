import { describe, expect, it } from 'vitest';
import { googleStorageAuthOptions } from './gcp-storage-auth';

describe('googleStorageAuthOptions', () => {
  it('uses serverless JSON credentials', () => {
    expect(
      googleStorageAuthOptions({
        GOOGLE_APPLICATION_CREDENTIALS_JSON:
          '{"project_id":"tatt-test","client_email":"test@example.com","private_key":"key"}',
      })
    ).toEqual({
      credentials: {
        project_id: 'tatt-test',
        client_email: 'test@example.com',
        private_key: 'key',
      },
    });
  });

  it('supports split credentials and repairs escaped newlines', () => {
    expect(
      googleStorageAuthOptions({
        GCP_PROJECT_ID: 'tatt-test',
        GCP_SERVICE_ACCOUNT_EMAIL: 'test@example.com',
        GCP_PRIVATE_KEY: 'line-1\\nline-2',
      })
    ).toEqual({
      credentials: {
        project_id: 'tatt-test',
        client_email: 'test@example.com',
        private_key: 'line-1\nline-2',
      },
    });
  });

  it('preserves local credential-file fallback', () => {
    expect(
      googleStorageAuthOptions({ GOOGLE_APPLICATION_CREDENTIALS: '/tmp/service-account.json' })
    ).toEqual({ keyFilename: '/tmp/service-account.json' });
  });

  it('rejects malformed JSON instead of silently falling through', () => {
    expect(() =>
      googleStorageAuthOptions({ GOOGLE_APPLICATION_CREDENTIALS_JSON: '{nope' })
    ).toThrow('Google Cloud service-account JSON is invalid');
  });
});
