import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  generateMock,
  recoverGeneratedImageMock,
  reconcileReservedSpendMock,
  releaseReservedSpendMock,
  reserveSpendMock,
  uploadGeneratedImageMock,
  verifyCloudTaskRequestMock,
  versionGetMock,
  versionSetMock,
} = vi.hoisted(() => ({
  generateMock: vi.fn(),
  recoverGeneratedImageMock: vi.fn(),
  reconcileReservedSpendMock: vi.fn(),
  releaseReservedSpendMock: vi.fn(),
  reserveSpendMock: vi.fn(),
  uploadGeneratedImageMock: vi.fn(),
  verifyCloudTaskRequestMock: vi.fn(),
  versionGetMock: vi.fn(),
  versionSetMock: vi.fn(),
}));

const versionRef = {
  get: versionGetMock,
  set: versionSetMock,
};
const versionsCollection = { doc: vi.fn(() => versionRef) };
const designRef = { collection: vi.fn(() => versionsCollection) };
const designsCollection = { doc: vi.fn(() => designRef) };
const userRef = { collection: vi.fn(() => designsCollection) };
const usersCollection = { doc: vi.fn(() => userRef) };

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'server-timestamp') },
  getFirestore: vi.fn(() => ({ collection: vi.fn(() => usersCollection) })),
}));

vi.mock('@/services/generation', () => ({ generate: generateMock }));
vi.mock('../../../../../services/storage/imageStorageService', () => ({
  recoverGeneratedImage: recoverGeneratedImageMock,
  uploadGeneratedImage: uploadGeneratedImageMock,
}));
vi.mock('../../../../../lib/cloud-tasks-auth', () => ({
  verifyCloudTaskRequest: verifyCloudTaskRequestMock,
}));
vi.mock('../../../../../lib/budget-tracker', () => ({
  reconcileReservedSpend: reconcileReservedSpendMock,
  releaseReservedSpend: releaseReservedSpendMock,
  reserveSpend: reserveSpendMock,
  VERTEX_IMAGEN_COST_CENTS: 4,
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('https://tatt.example/api/v1/tasks/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cloudtasks-taskname': 'projects/tatt/locations/us/queues/generation/tasks/task-1',
    },
    body: JSON.stringify(body),
  });
}

const taskBody = {
  userId: 'user-1',
  prompt: 'blackwork dragon tattoo',
  parameters: { sampleCount: 2 },
  designId: 'design-1',
  versionId: 'version-1',
};
const reservationKey = 'async-imagen:user-1:design-1:version-1';

function vertexResult(imageCount = 2) {
  return {
    images: Array.from({ length: imageCount }, (_, index) =>
      `data:image/png;base64,${Buffer.from(`image-${index}`).toString('base64')}`
    ),
    metadata: { model: 'imagen-3.0-generate-001', provider: 'vertex-ai' },
  };
}

describe('/api/v1/tasks/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyCloudTaskRequestMock.mockResolvedValue(true);
    versionGetMock.mockResolvedValue({ data: () => ({}) });
    reserveSpendMock.mockResolvedValue({
      allowed: true,
      acquired: true,
      status: 'reserved',
      reservedCents: 8,
      leaseExpiresAtMs: Date.now() + 900_000,
      takeover: false,
      spentCents: 108,
      remainingCents: 49_892,
    });
    generateMock.mockResolvedValue(vertexResult());
    reconcileReservedSpendMock.mockResolvedValue(undefined);
    releaseReservedSpendMock.mockResolvedValue(undefined);
    recoverGeneratedImageMock.mockResolvedValue(null);
    uploadGeneratedImageMock.mockResolvedValue('https://storage.example/design.png');
    versionSetMock.mockResolvedValue(undefined);
  });

  it('preserves the Cloud Tasks OIDC gate before any paid work', async () => {
    verifyCloudTaskRequestMock.mockResolvedValue(false);

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(401);
    expect(reserveSpendMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('atomically denies a reservation that would exceed the shared budget', async () => {
    reserveSpendMock.mockResolvedValue({
      allowed: false,
      acquired: false,
      status: 'denied',
      reservedCents: 0,
      leaseExpiresAtMs: null,
      takeover: false,
      spentCents: 49_996,
      remainingCents: 4,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(402);
    expect(reserveSpendMock).toHaveBeenCalledWith(
      reservationKey,
      8,
      expect.objectContaining({
        ownerId: expect.stringContaining('task-1'),
        leaseMs: 900_000,
      })
    );
    expect(generateMock).not.toHaveBeenCalled();
    expect(reconcileReservedSpendMock).not.toHaveBeenCalled();
  });

  it('fails closed when reserving budget is unavailable', async () => {
    reserveSpendMock.mockRejectedValue(new Error('Firestore unavailable'));

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(500);
    expect(generateMock).not.toHaveBeenCalled();
    expect(reconcileReservedSpendMock).not.toHaveBeenCalled();
  });

  it('allows only the delivery that acquired the idempotent reservation to generate', async () => {
    reserveSpendMock.mockResolvedValue({
      allowed: true,
      acquired: false,
      status: 'reserved',
      reservedCents: 8,
      leaseExpiresAtMs: Date.now() + 900_000,
      takeover: false,
      spentCents: 108,
      remainingCents: 49_892,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(409);
    expect(generateMock).not.toHaveBeenCalled();
    expect(reconcileReservedSpendMock).not.toHaveBeenCalled();
  });

  it('reconciles the reservation to the actual number of Vertex images', async () => {
    generateMock.mockResolvedValue(vertexResult(3));

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(200);
    expect(reserveSpendMock).toHaveBeenCalledWith(
      reservationKey,
      8,
      expect.objectContaining({ leaseMs: 900_000 })
    );
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'blackwork dragon tattoo',
        numImages: 2,
        modelId: 'imagen3',
        allowProviderFallback: false,
      })
    );
    expect(reconcileReservedSpendMock).toHaveBeenCalledWith(reservationKey, 4 * 3);
    expect(reserveSpendMock.mock.invocationCallOrder[0]).toBeLessThan(
      generateMock.mock.invocationCallOrder[0]
    );
    expect(reconcileReservedSpendMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      generateMock.mock.invocationCallOrder[0]
    );
    expect(uploadGeneratedImageMock).toHaveBeenCalledWith(
      'user-1',
      'design-1',
      'version-1',
      expect.any(Uint8Array),
      { actualImageCount: 3 }
    );
    expect(versionSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'https://storage.example/design.png',
        generation: expect.objectContaining({
          taskName: 'projects/tatt/locations/us/queues/generation/tasks/task-1',
          provider: 'vertex-ai',
          model: 'imagen-3.0-generate-001',
        }),
      }),
      { merge: true }
    );
  });

  it('releases the reservation when Vertex fails before billable success', async () => {
    generateMock.mockRejectedValue(new Error('Vertex unavailable'));

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(500);
    expect(releaseReservedSpendMock).toHaveBeenCalledWith(reservationKey);
    expect(reconcileReservedSpendMock).not.toHaveBeenCalled();
    expect(uploadGeneratedImageMock).not.toHaveBeenCalled();
  });

  it('releases the reservation when Vertex returns no images', async () => {
    generateMock.mockResolvedValue(vertexResult(0));

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(500);
    expect(releaseReservedSpendMock).toHaveBeenCalledWith(reservationKey);
    expect(reconcileReservedSpendMock).not.toHaveBeenCalled();
  });

  it('takes over an expired pre-provider lease and completes generation', async () => {
    reserveSpendMock.mockResolvedValue({
      allowed: true,
      acquired: true,
      status: 'reserved',
      reservedCents: 8,
      leaseExpiresAtMs: Date.now() + 900_000,
      takeover: true,
      spentCents: 108,
      remainingCents: 49_892,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(200);
    expect(recoverGeneratedImageMock.mock.invocationCallOrder[0]).toBeLessThan(
      generateMock.mock.invocationCallOrder[0]
    );
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('recovers staged output during lease takeover instead of calling Vertex again', async () => {
    reserveSpendMock.mockResolvedValue({
      allowed: true,
      acquired: true,
      status: 'reserved',
      reservedCents: 8,
      leaseExpiresAtMs: Date.now() + 900_000,
      takeover: true,
      spentCents: 108,
      remainingCents: 49_892,
    });
    recoverGeneratedImageMock.mockResolvedValue({
      imageUrl: 'https://storage.example/staged.png',
      actualImageCount: 2,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(200);
    expect(generateMock).not.toHaveBeenCalled();
    expect(reconcileReservedSpendMock).toHaveBeenCalledWith(reservationKey, 8);
    expect(versionSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'https://storage.example/staged.png' }),
      { merge: true }
    );
  });

  it('recovers from a failed release after lease expiry', async () => {
    generateMock.mockRejectedValueOnce(new Error('Vertex unavailable'));
    releaseReservedSpendMock.mockRejectedValueOnce(new Error('Firestore unavailable'));

    const failedResponse = await POST(makeRequest(taskBody));

    expect(failedResponse.status).toBe(500);
    expect(releaseReservedSpendMock).toHaveBeenCalledWith(reservationKey);

    reserveSpendMock.mockResolvedValue({
      allowed: true,
      acquired: true,
      status: 'reserved',
      reservedCents: 8,
      leaseExpiresAtMs: Date.now() + 900_000,
      takeover: true,
      spentCents: 108,
      remainingCents: 49_892,
    });
    const retryResponse = await POST(makeRequest(taskBody));

    expect(retryResponse.status).toBe(200);
    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(reconcileReservedSpendMock).toHaveBeenCalledWith(reservationKey, 8);
  });

  it('recovers a billed deterministic upload without purchasing another render', async () => {
    reserveSpendMock.mockResolvedValue({
      allowed: true,
      acquired: false,
      status: 'billed',
      reservedCents: 8,
      leaseExpiresAtMs: null,
      takeover: false,
      spentCents: 108,
      remainingCents: 49_892,
    });
    recoverGeneratedImageMock.mockResolvedValue({
      imageUrl: 'https://storage.example/recovered.png',
      actualImageCount: 2,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(200);
    expect(generateMock).not.toHaveBeenCalled();
    expect(reconcileReservedSpendMock).not.toHaveBeenCalled();
    expect(uploadGeneratedImageMock).not.toHaveBeenCalled();
    expect(versionSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'https://storage.example/recovered.png',
        generation: expect.objectContaining({ recoveredFromRetry: true }),
      }),
      { merge: true }
    );
  });

  it('never re-renders after a billable success whose upload failed', async () => {
    uploadGeneratedImageMock.mockRejectedValueOnce(new Error('GCS unavailable'));

    const firstResponse = await POST(makeRequest(taskBody));

    expect(firstResponse.status).toBe(500);
    expect(reconcileReservedSpendMock).toHaveBeenCalledWith(reservationKey, 8);
    expect(releaseReservedSpendMock).not.toHaveBeenCalled();
    expect(generateMock).toHaveBeenCalledTimes(1);

    reserveSpendMock.mockResolvedValue({
      allowed: true,
      acquired: false,
      status: 'billed',
      reservedCents: 8,
      leaseExpiresAtMs: null,
      takeover: false,
      spentCents: 108,
      remainingCents: 49_892,
    });
    const retryResponse = await POST(makeRequest(taskBody));

    expect(retryResponse.status).toBe(500);
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(uploadGeneratedImageMock).toHaveBeenCalledTimes(1);
  });

  it('returns an existing completed version without reserving or generating', async () => {
    versionGetMock.mockResolvedValue({
      data: () => ({ imageUrl: 'https://storage.example/already-complete.png' }),
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      imageUrl: 'https://storage.example/already-complete.png',
    });
    expect(reserveSpendMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});
