import { getApps, initializeApp, cert } from 'firebase-admin/app';

/**
 * Idempotent Firebase Admin bootstrap. Every server-side module that
 * touches firebase-admin (Firestore, Auth) must call this before use —
 * module-side-effect init in one file doesn't help a serverless
 * function whose import graph never reaches that file.
 *
 * Credential sources, in order:
 *  1. GOOGLE_APPLICATION_CREDENTIALS_JSON / FIREBASE_SERVICE_ACCOUNT_JSON
 *     (full service-account JSON in one env var) → 'sa-json'
 *  2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *     → 'firebase-triplet'
 *  3. Project-id only → 'project-only-adc'. This defers auth to
 *     Application Default Credentials at request time, which on Vercel
 *     only works if GOOGLE_APPLICATION_CREDENTIALS points somewhere
 *     real (it usually doesn't). Callers that need certainty should
 *     treat this source as unhealthy.
 *
 * Returns the source used (truthy) or false when unconfigured. A parse
 * or cert failure in one source falls through to the next instead of
 * aborting the chain.
 */
export type AdminCredSource = 'sa-json' | 'firebase-triplet' | 'project-only-adc' | 'pre-initialized';

let initializedSource: AdminCredSource | null = null;

export function ensureAdminApp(): AdminCredSource | false {
  if (getApps().length > 0) return initializedSource ?? 'pre-initialized';

  // 1. Full service-account JSON in env
  const json =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const creds = JSON.parse(json);
      if (creds.project_id && creds.client_email && creds.private_key) {
        initializeApp({
          credential: cert({
            projectId: creds.project_id,
            clientEmail: creds.client_email,
            privateKey: creds.private_key,
          }),
        });
        initializedSource = 'sa-json';
        return initializedSource;
      }
      console.warn('[firebase-admin] service-account JSON env is missing project_id/client_email/private_key; trying FIREBASE_* vars');
    } catch (e) {
      console.warn('[firebase-admin] service-account JSON env failed to parse/init; trying FIREBASE_* vars:', e instanceof Error ? e.message : e);
    }
  }

  // 2. Individual FIREBASE_* vars
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      initializedSource = 'firebase-triplet';
      return initializedSource;
    } catch (e) {
      console.warn('[firebase-admin] FIREBASE_* cert init failed; falling back to ADC:', e instanceof Error ? e.message : e);
    }
  }

  // 3. Project-id only — Application Default Credentials at request time
  if (projectId) {
    try {
      initializeApp({ projectId });
      initializedSource = 'project-only-adc';
      return initializedSource;
    } catch {
      return false;
    }
  }
  return false;
}
