import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export interface QuotaConfig {
  maxRequests: number;
  windowMs: number;
}

export const QUOTA_CONFIGS: Record<string, QuotaConfig> = {
  generation: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20/hr
  matching: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hr
  council: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20/hr
  upload: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50/hr
  default: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200/hr
};

export type QuotaResult = {
  allowed: boolean;
  retryAfter?: number;
};

export async function checkQuota(userId: string, endpoint: string): Promise<QuotaResult> {
  const db = getFirestore();
  const config = QUOTA_CONFIGS[endpoint] || QUOTA_CONFIGS.default;
  const windowStart = Date.now() - config.windowMs;

  const quotaRef = db.collection('quotas').doc(userId).collection('endpoints').doc(endpoint);

  try {
    return await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(quotaRef);
      const data = snapshot.data();

      const activeRequests = (Array.isArray(data?.requests) ? data!.requests : []).filter(
        (ts: unknown) => typeof ts === 'number' && ts > windowStart
      ) as number[];

      if (activeRequests.length >= config.maxRequests) {
        const oldest = Math.min(...activeRequests);
        const retryAfter = Math.max(1, Math.ceil((oldest + config.windowMs - Date.now()) / 1000));
        return { allowed: false, retryAfter };
      }

      const updatedRequests = [...activeRequests, Date.now()];
      tx.set(
        quotaRef,
        {
          requests: updatedRequests,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        allowed: true,
      };
    });
  } catch (error) {
    console.warn(
      `[Quota] Firestore unavailable for quota tracking; allowing request for ${userId}/${endpoint}.`,
      error
    );
    return { allowed: true };
  }
}

export async function resetQuota(userId: string, endpoint: string): Promise<void> {
  const db = getFirestore();
  const quotaRef = db.collection('quotas').doc(userId).collection('endpoints').doc(endpoint);
  await quotaRef.delete();
}
