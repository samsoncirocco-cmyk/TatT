import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  existsMock,
  getMetadataMock,
  makePublicMock,
  storageOptions,
} = vi.hoisted(() => ({
  existsMock: vi.fn(),
  getMetadataMock: vi.fn(),
  makePublicMock: vi.fn(),
  storageOptions: [] as unknown[],
}));

vi.mock('@google-cloud/storage', () => ({
  Storage: class {
    constructor(options: unknown) {
      storageOptions.push(options);
    }
    bucket() {
      return {
        file: () => ({
          exists: existsMock,
          getMetadata: getMetadataMock,
          makePublic: makePublicMock,
        }),
      };
    }
  },
}));

import { recoverGeneratedImage } from './imageStorageService';

describe('generated image recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', undefined);
    existsMock.mockResolvedValue([true]);
    makePublicMock.mockResolvedValue(undefined);
    getMetadataMock.mockResolvedValue([
      { metadata: { actualImageCount: '3' } },
    ]);
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON', JSON.stringify({
      project_id: 'tatt-test',
      client_email: 'storage-test@example.com',
      private_key: 'test-key',
    }));
    vi.stubEnv('GCP_PROJECT_ID', 'tatt-test');
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('repairs publication for an existing private object and returns staged metadata', async () => {
    const recovered = await recoverGeneratedImage('user-1', 'design-1', 'version-1');

    expect(makePublicMock).toHaveBeenCalledTimes(1);
    expect(recovered).toEqual({
      imageUrl:
        'https://storage.googleapis.com/tatt-pro-assets/generated/user-1/design-1/version-1/design.png',
      actualImageCount: 3,
    });
    expect(storageOptions[0]).toEqual({
      credentials: {
        project_id: 'tatt-test',
        client_email: 'storage-test@example.com',
        private_key: 'test-key',
      },
      projectId: 'tatt-test',
    });
  });

  it('returns null without trying to publish when the staged object is absent', async () => {
    existsMock.mockResolvedValue([false]);

    await expect(
      recoverGeneratedImage('user-1', 'design-1', 'version-1')
    ).resolves.toBeNull();
    expect(makePublicMock).not.toHaveBeenCalled();
  });
});
