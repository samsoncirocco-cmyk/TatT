type StorageCredentials = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

export type GoogleStorageAuthOptions =
  | { credentials: StorageCredentials }
  | { keyFilename: string }
  | Record<string, never>;

/** Resolve the credential shapes used by serverless and local GCS clients. */
export function googleStorageAuthOptions(
  env: Readonly<Record<string, string | undefined>> = process.env
): GoogleStorageAuthOptions {
  const json = env.GOOGLE_APPLICATION_CREDENTIALS_JSON || env.GCP_SERVICE_ACCOUNT_KEY;
  if (json) {
    try {
      return { credentials: JSON.parse(json) };
    } catch {
      throw new Error('Google Cloud service-account JSON is invalid');
    }
  }
  if (env.GCP_SERVICE_ACCOUNT_EMAIL && env.GCP_PRIVATE_KEY) {
    return {
      credentials: {
        project_id: env.GCP_PROJECT_ID || env.GCLOUD_PROJECT,
        client_email: env.GCP_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    };
  }
  return env.GOOGLE_APPLICATION_CREDENTIALS
    ? { keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS }
    : {};
}
