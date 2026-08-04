import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runMock, closeMock, sessionMock } = vi.hoisted(() => {
  const runMock = vi.fn();
  const closeMock = vi.fn();
  const executeWriteMock = vi.fn(async (work: (tx: { run: typeof runMock }) => Promise<unknown>) =>
    work({ run: runMock }),
  );
  const sessionMock = vi.fn(() => ({ executeWrite: executeWriteMock, close: closeMock }));
  return { runMock, closeMock, sessionMock };
});

vi.mock('@/lib/neo4j', () => ({
  getNeo4jDriver: () => ({ session: sessionMock }),
  NEO4J_DATABASE: undefined,
  NEO4J_QUERY_TIMEOUT: 5_000,
}));

vi.mock('neo4j-driver', () => ({ default: { int: (value: number) => value } }));

import { recordArtistIntroRequest } from './artist-intro-graph';

describe('recordArtistIntroRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runMock.mockResolvedValue({ records: [{ toObject: () => ({ artistName: 'Nadia Ink' }) }] });
  });

  it('updates a pending relay when an idempotent retry corrects contact details', async () => {
    const result = await recordArtistIntroRequest(
      {
        clientRequestId: '0d1c8c04-8c5b-4a27-91f9-50d513b2b5d1',
        artistId: 'artist_nadia.ink',
        clientName: 'Maya Updated',
        clientEmail: 'maya.correct@example.com',
        message: 'Updated placement note',
      },
      'IN-0d1c8c04-8c5b-4a27-91f9-50d513b2b5d1',
    );

    expect(result).toEqual({ artistName: 'Nadia Ink' });
    const [query, params] = runMock.mock.calls[0];
    expect(query).toContain('ON MATCH SET');
    expect(query).toContain('r.clientEmail = CASE WHEN r.status = \'pending_relay\' THEN $clientEmail');
    expect(query).toContain('WHERE r.artistId = a.id AND r.clientEmail = $clientEmail');
    expect(params).toMatchObject({
      requestId: 'IN-0d1c8c04-8c5b-4a27-91f9-50d513b2b5d1',
      clientEmail: 'maya.correct@example.com',
      clientName: 'Maya Updated',
    });
    expect(closeMock).toHaveBeenCalledOnce();
  });
});
