import { getApps, initializeApp, cert } from 'firebase-admin/app';

/**
 * Idempotent Firebase Admin bootstrap. Every server-side module that
 * touches firebase-admin (Firestore, Auth) must call this before use —
 * module-side-effect init in one file doesn't help a serverless
 * function whose import graph never reaches that file.
 *
 * Credential sources, in order:
 *  1. GOOGLE_APPLICATION_CREDENTIALS_JSON / FIREBASE_SERVICE_ACCOUNT_JSON
 *     (full service-account JSON in one env var)
 *  2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *  3. Project-id only (Application Default Credentials — local dev)
 *
 * Returns true when an app is available; false when unconfigured.
 */
export function ensureAdminApp(): boolean {
  if (getApps().length > 0) return true;

  try {
    const json =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
      const creds = JSON.parse(json);
      if (creds.project_id && creds.client_email && creds.private_key) {
        initializeApp({
          credential: cert({
            projectId: creds.project_id,
            clientEmail: creds.client_email,
            privateKey: creds.private_key,
          }),
        });
        return true;
      }
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      return true;
    }
    if (projectId) {
      initializeApp({ projectId });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
