import { OAuth2Client } from 'google-auth-library';
import type { NextRequest } from 'next/server';

const verifier = new OAuth2Client();

export async function verifyCloudTaskRequest(req: NextRequest): Promise<boolean> {
  const taskUrl = process.env.CLOUD_RUN_URL
    ? `${process.env.CLOUD_RUN_URL.replace(/\/+$/, '')}/api/v1/tasks/generate`
    : undefined;
  const audience = process.env.CLOUD_TASKS_AUDIENCE || taskUrl;
  const expectedServiceAccount = process.env.CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT || process.env.TASK_SERVICE_ACCOUNT;
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
