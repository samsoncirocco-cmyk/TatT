import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const cache = new Map<string, string>();

const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/**
 * Retrieve a secret from GCP Secret Manager with in-memory caching.
 * Falls back to process.env for local development.
 */
export async function getSecret(secretName: string): Promise<string> {
  const cached = cache.get(secretName);
  if (cached) return cached;

  // Try Secret Manager first
  if (projectId) {
    try {
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      const value = version.payload?.data?.toString();
      if (value) {
        cache.set(secretName, value);
        return value;
      }
    } catch (err: any) {
      // Secret Manager unavailable — fall through to env var
      if (err.code !== 5 && err.code !== 7) {
        // Not NOT_FOUND or PERMISSION_DENIED — log unexpected errors
        console.warn(`[SecretManager] Failed to access '${secretName}':`, err.message);
      }
    }
  }

  // Fallback to environment variable (local dev with .env.local)
  const envValue = process.env[secretName];
  if (envValue) {
    cache.set(secretName, envValue);
    return envValue;
  }

  throw new Error(`Secret '${secretName}' not found in Secret Manager or environment variables`);
}

/**
 * Load multiple secrets in parallel.
 */
export async function loadSecrets(names: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    names.map(async (name) => {
      const value = await getSecret(name);
      return [name, value] as const;
    })
  );
  return Object.fromEntries(entries);
}
