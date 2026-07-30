import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  checkBudgetMock,
  generateMock,
  recordSpendMock,
  uploadGeneratedImageMock,
  verifyCloudTaskRequestMock,
  versionGetMock,
  versionSetMock,
} = vi.hoisted(() => ({
  checkBudgetMock: vi.fn(),
  generateMock: vi.fn(),
  recordSpendMock: vi.fn(),
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
  uploadGeneratedImage: uploadGeneratedImageMock,
}));
vi.mock('../../../../../lib/cloud-tasks-auth', () => ({
  verifyCloudTaskRequest: verifyCloudTaskRequestMock,
}));
vi.mock('../../../../../lib/budget-tracker', () => ({
  checkBudget: checkBudgetMock,
  recordSpend: recordSpendMock,
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
    checkBudgetMock.mockResolvedValue({
      allowed: true,
      spentCents: 100,
      remainingCents: 1_000,
    });
    generateMock.mockResolvedValue(vertexResult());
    recordSpendMock.mockResolvedValue(undefined);
    uploadGeneratedImageMock.mockResolvedValue('https://storage.example/design.png');
    versionSetMock.mockResolvedValue(undefined);
  });

  it('preserves the Cloud Tasks OIDC gate before any paid work', async () => {
    verifyCloudTaskRequestMock.mockResolvedValue(false);

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(401);
    expect(checkBudgetMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('denies generation when the shared budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({
      allowed: false,
      spentCents: 50_000,
      remainingCents: 0,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Budget limit reached',
      spentCents: 50_000,
    });
    expect(generateMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('fails closed when the shared budget backing store is unavailable', async () => {
    checkBudgetMock.mockResolvedValue({
      allowed: true,
      spentCents: 0,
      remainingCents: -1,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(503);
    expect(generateMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('does not start a request whose full requested cost exceeds the remaining budget', async () => {
    checkBudgetMock.mockResolvedValue({
      allowed: true,
      spentCents: 49_996,
      remainingCents: 4,
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(402);
    expect(generateMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('records the actual number of Vertex images after generation succeeds', async () => {
    generateMock.mockResolvedValue(vertexResult(3));

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(200);
    expect(checkBudgetMock).toHaveBeenCalledWith('user-1');
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'blackwork dragon tattoo',
        numImages: 2,
        modelId: 'imagen3',
        allowProviderFallback: false,
      })
    );
    expect(recordSpendMock).toHaveBeenCalledWith(4 * 3);
    expect(recordSpendMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      generateMock.mock.invocationCallOrder[0]
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

  it('never records spend when Vertex generation fails', async () => {
    generateMock.mockRejectedValue(new Error('Vertex unavailable'));

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(500);
    expect(recordSpendMock).not.toHaveBeenCalled();
    expect(uploadGeneratedImageMock).not.toHaveBeenCalled();
    expect(versionSetMock).not.toHaveBeenCalled();
  });

  it('never records spend when Vertex returns no images', async () => {
    generateMock.mockResolvedValue(vertexResult(0));

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(500);
    expect(recordSpendMock).not.toHaveBeenCalled();
    expect(uploadGeneratedImageMock).not.toHaveBeenCalled();
  });

  it('returns an existing completed version without duplicate generation or spend', async () => {
    versionGetMock.mockResolvedValue({
      data: () => ({ imageUrl: 'https://storage.example/already-complete.png' }),
    });

    const response = await POST(makeRequest(taskBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      imageUrl: 'https://storage.example/already-complete.png',
    });
    expect(checkBudgetMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
    expect(uploadGeneratedImageMock).not.toHaveBeenCalled();
    expect(versionSetMock).not.toHaveBeenCalled();
  });
});
