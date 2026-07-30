/**
 * Inbound MMS media (TAT-50): webhook field parsing, the Twilio fetch
 * (basic auth, type and size caps), and the fetch+analyze batch with its
 * per-message cap and budget stop. Vision is mocked at the module boundary;
 * the network is a stubbed global fetch.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseInboundMedia,
  fetchTwilioMedia,
  analyzeInboundMedia,
} from '../internal/media';
import { analyzeReferenceImage } from '@/services/vision';

vi.mock('@/services/vision', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/vision')>();
  return { ...actual, analyzeReferenceImage: vi.fn() };
});

const analyzeMock = vi.mocked(analyzeReferenceImage);

const PNG_BYTES = Buffer.from('fake-png-bytes');

function mediaResponse(
  overrides: { status?: number; contentType?: string; bytes?: Buffer; contentLength?: string } = {}
) {
  const bytes = overrides.bytes ?? PNG_BYTES;
  const headers = new Map<string, string>([
    ['content-type', overrides.contentType ?? 'image/png'],
    ...(overrides.contentLength !== undefined
      ? ([['content-length', overrides.contentLength]] as [string, string][])
      : []),
  ]);
  return {
    ok: (overrides.status ?? 200) < 400,
    status: overrides.status ?? 200,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(mediaResponse());
  analyzeMock.mockResolvedValue({
    status: 'analyzed',
    analysis: {
      summary: 'a bold rose',
      subjects: ['rose'],
      characters: [],
      styleDescriptors: ['traditional'],
      palette: ['red'],
      composition: 'centered',
      confidence: 0.9,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('parseInboundMedia', () => {
  it('reads NumMedia + MediaUrl{N}/MediaContentType{N} in order', () => {
    const media = parseInboundMedia({
      NumMedia: '2',
      MediaUrl0: 'https://api.twilio.com/m/0',
      MediaContentType0: 'image/jpeg',
      MediaUrl1: 'https://api.twilio.com/m/1',
      MediaContentType1: 'IMAGE/PNG',
    });
    expect(media).toEqual([
      { url: 'https://api.twilio.com/m/0', contentType: 'image/jpeg' },
      { url: 'https://api.twilio.com/m/1', contentType: 'image/png' },
    ]);
  });

  it('returns empty on absent, zero, or garbage NumMedia', () => {
    expect(parseInboundMedia({})).toEqual([]);
    expect(parseInboundMedia({ NumMedia: '0' })).toEqual([]);
    expect(parseInboundMedia({ NumMedia: 'lots' })).toEqual([]);
  });

  it('never loops past Twilio\'s attachment ceiling on a hostile NumMedia', () => {
    const params: Record<string, string> = { NumMedia: '999999' };
    for (let i = 0; i < 12; i += 1) params[`MediaUrl${i}`] = `https://api.twilio.com/m/${i}`;
    expect(parseInboundMedia(params)).toHaveLength(10);
  });
});

describe('fetchTwilioMedia', () => {
  const ITEM = { url: 'https://api.twilio.com/m/0', contentType: 'image/png' };

  it('fetches with basic auth when account credentials are configured', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACxxx');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'token');

    const image = await fetchTwilioMedia(ITEM);

    expect(image).toEqual({ data: PNG_BYTES.toString('base64'), mimeType: 'image/png' });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from('ACxxx:token').toString('base64')}`
    );
  });

  it('fetches without auth when credentials are absent (public media)', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', '');
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');

    const image = await fetchTwilioMedia(ITEM);

    expect(image).not.toBeNull();
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('skips non-image attachments without fetching', async () => {
    const image = await fetchTwilioMedia({ url: ITEM.url, contentType: 'text/vcard' });
    expect(image).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses over-size media (declared and actual)', async () => {
    fetchMock.mockResolvedValueOnce(mediaResponse({ contentLength: String(6 * 1024 * 1024) }));
    expect(await fetchTwilioMedia(ITEM)).toBeNull();

    fetchMock.mockResolvedValueOnce(
      mediaResponse({ bytes: Buffer.alloc(5 * 1024 * 1024 + 1) })
    );
    expect(await fetchTwilioMedia(ITEM)).toBeNull();
  });

  it('returns null on HTTP failure or network error — never throws', async () => {
    fetchMock.mockResolvedValueOnce(mediaResponse({ status: 404 }));
    expect(await fetchTwilioMedia(ITEM)).toBeNull();

    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await fetchTwilioMedia(ITEM)).toBeNull();
  });

  it('prefers the response content-type over the declared one', async () => {
    fetchMock.mockResolvedValueOnce(mediaResponse({ contentType: 'image/jpeg; charset=binary' }));
    const image = await fetchTwilioMedia({ url: ITEM.url, contentType: 'image/png' });
    expect(image!.mimeType).toBe('image/jpeg');
  });
});

describe('analyzeInboundMedia', () => {
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      url: `https://api.twilio.com/m/${i}`,
      contentType: 'image/png',
    }));

  it('analyzes at most three images and counts the rest as ignored', async () => {
    const ingest = await analyzeInboundMedia(items(5));
    expect(ingest.analyses).toHaveLength(3);
    expect(ingest.ignored).toBe(2);
    expect(analyzeMock).toHaveBeenCalledTimes(3);
  });

  it('counts unreadable items and keeps going', async () => {
    fetchMock.mockResolvedValueOnce(mediaResponse({ status: 404 }));
    const ingest = await analyzeInboundMedia(items(2));
    expect(ingest.analyses).toHaveLength(1);
    expect(ingest.unreadable).toBe(1);
  });

  it('stops the batch the moment the budget gate refuses', async () => {
    analyzeMock.mockResolvedValueOnce({ status: 'budget_exhausted' });
    const ingest = await analyzeInboundMedia(items(3));
    expect(ingest.budgetExhausted).toBe(true);
    expect(ingest.analyses).toHaveLength(0);
    expect(analyzeMock).toHaveBeenCalledTimes(1);
  });
});
