import { OAuth2Client } from 'google-auth-library';
import type { NextRequest } from 'next/server';

const verifier = new OAuth2Client();

/**
 * Verify a Cloud Tasks OIDC bearer token.
 *
 * Fails closed when audience / service-account config is missing.
 * A local-dev bypass is honored ONLY when ALLOW_UNAUTHENTICATED_TASKS=true
 * and NODE_ENV is not production (main behavior).
 *
 * Env aliases accepted (hardening branch names + main's OIDC names):
 *   audience: CLOUD_TASKS_AUDIENCE | CLOUD_TASKS_OIDC_AUDIENCE | derived from CLOUD_RUN_URL
 *   SA email: CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT | TASK_SERVICE_ACCOUNT | CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL
 */
export async function verifyCloudTaskRequest(req: NextRequest): Promise<boolean> {
  const bypassAllowed =
    process.env.ALLOW_UNAUTHENTICATED_TASKS === 'true' &&
    process.env.NODE_ENV !== 'production';
  if (bypassAllowed) return true;

  const taskUrl = process.env.CLOUD_RUN_URL
    ? `${process.env.CLOUD_RUN_URL.replace(/\/+$/, '')}/api/v1/tasks/generate`
    : undefined;
  const audience =
    process.env.CLOUD_TASKS_AUDIENCE ||
    process.env.CLOUD_TASKS_OIDC_AUDIENCE ||
    taskUrl;
  const expectedServiceAccount =
    process.env.CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT ||
    process.env.TASK_SERVICE_ACCOUNT ||
    process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
  const authorization = req.headers.get('authorization');

  if (!audience || !expectedServiceAccount || !authorization?.startsWith('Bearer ')) {
    return false;
  }

  try {
    const ticket = await verifier.verifyIdToken({
      idToken: authorization.slice(7),
      audience,
    });
    const payload = ticket.getPayload();
    return payload?.email === expectedServiceAccount && payload.email_verified === true;
  } catch {
    return false;
  }
}
