import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

/**
 * The capture pipeline and link resolver have their own suites
 * (captureService.test.ts, shareCapture.test.ts, shareLink.test.ts); here
 * they are mocked so the component tests exercise the mirror's wiring —
 * which buttons exist, what a tap does, what state each outcome renders —
 * without jsdom needing to encode video.
 */
const captureMocks = vi.hoisted(() => ({
  clipSupported: true,
  downloadBlob: vi.fn(),
  recordCanvasClip: vi.fn(),
  shareLink: null as string | null,
}));

vi.mock('@/services/ar/captureService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ar/captureService')>();
  return {
    ...actual,
    checkClipSupport: () =>
      captureMocks.clipSupported
        ? { supported: true, mime: { mimeType: 'video/webm', extension: 'webm' } }
        : { supported: false, mime: null },
    compositeFrame: vi.fn(),
    canvasToPngBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
    recordCanvasClip: captureMocks.recordCanvasClip,
    downloadBlob: captureMocks.downloadBlob,
  };
});

vi.mock('../shareLink', () => ({
  resolveShareLink: vi.fn(async () => captureMocks.shareLink),
}));

import ARMirror from '../components/ARMirror';

/**
 * `new Image()` is replaced with a real painted canvas. jsdom will not fetch a
 * URL, but node-canvas will happily let the analyzer read a canvas back — so
 * the on-skin guard is exercised against genuine pixels here rather than a
 * mocked verdict.
 */
const SIZE = 64;

type Painter = (ctx: CanvasRenderingContext2D) => void;

const painters: Record<string, Painter> = {
  'flash.png': (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#101010';
    ctx.fillRect(20, 20, 24, 24);
  },
  'onskin.png': (ctx) => {
    ctx.fillStyle = 'rgb(198,134,102)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#101010';
    ctx.fillRect(20, 20, 24, 24);
  },
};

function installImageStub() {
  // `new Image()` yields a real <canvas> with an `src` setter bolted on. A
  // constructor that returns an object wins over `this`, so the component gets
  // something drawImage/getImageData accept natively.
  vi.stubGlobal(
    'Image',
    function FakeImage() {
      const canvas = document.createElement('canvas') as HTMLCanvasElement & {
        onload?: () => void;
        onerror?: () => void;
      };
      canvas.width = SIZE;
      canvas.height = SIZE;
      Object.defineProperty(canvas, 'src', {
        configurable: true,
        set(value: string) {
          const paint = painters[value];
          if (!paint) {
            queueMicrotask(() => canvas.onerror?.());
            return;
          }
          paint(canvas.getContext('2d')!);
          queueMicrotask(() => canvas.onload?.());
        },
      });
      return canvas;
    } as unknown as typeof Image,
  );
}

function makeTrack() {
  return { kind: 'video', stop: vi.fn() };
}

function stubCamera(impl: () => Promise<unknown>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(impl) } });
}

const designs = [
  { id: 'a', image: 'flash.png', title: 'Flash art' },
  { id: 'b', image: 'onskin.png', title: 'On-skin render' },
];

/** Prototype descriptors we replace, so they can be put back exactly. */
const mediaProto = HTMLMediaElement.prototype;
const videoProto = HTMLVideoElement.prototype;
const originalPlay = Object.getOwnPropertyDescriptor(mediaProto, 'play');
const originalReadyState = Object.getOwnPropertyDescriptor(mediaProto, 'readyState');
const originalVideoWidth = Object.getOwnPropertyDescriptor(videoProto, 'videoWidth');
const originalVideoHeight = Object.getOwnPropertyDescriptor(videoProto, 'videoHeight');

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true);
  captureMocks.clipSupported = true;
  captureMocks.shareLink = null;
  captureMocks.downloadBlob.mockClear();
  captureMocks.recordCanvasClip.mockReset();
  captureMocks.recordCanvasClip.mockResolvedValue(new Blob(['webm'], { type: 'video/webm' }));
  // jsdom has no media element playback.
  Object.defineProperty(mediaProto, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(mediaProto, 'readyState', {
    configurable: true,
    get: () => 1,
  });
  // jsdom video never has dimensions; captures need a non-zero frame.
  Object.defineProperty(videoProto, 'videoWidth', { configurable: true, get: () => SIZE });
  Object.defineProperty(videoProto, 'videoHeight', { configurable: true, get: () => SIZE });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // Put the prototype back. vi.restoreAllMocks() does not undo
  // defineProperty, and a permanently patched HTMLMediaElement is exactly the
  // kind of leak that surfaces as an unrelated suite failing somewhere else.
  if (originalPlay) Object.defineProperty(mediaProto, 'play', originalPlay);
  else Reflect.deleteProperty(mediaProto, 'play');
  if (originalReadyState) Object.defineProperty(mediaProto, 'readyState', originalReadyState);
  else Reflect.deleteProperty(mediaProto, 'readyState');
  if (originalVideoWidth) Object.defineProperty(videoProto, 'videoWidth', originalVideoWidth);
  else Reflect.deleteProperty(videoProto, 'videoWidth');
  if (originalVideoHeight) Object.defineProperty(videoProto, 'videoHeight', originalVideoHeight);
  else Reflect.deleteProperty(videoProto, 'videoHeight');
});

/** Click and let the resulting async state updates settle. */
async function clickAsync(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

async function startCamera() {
  await clickAsync(screen.getByRole('button', { name: /start camera/i }));
  await waitFor(() => expect(screen.queryByText(/starting camera/i)).toBeNull());
}

describe('ARMirror', () => {
  it('offers the camera when idle', () => {
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={designs} />);
    expect(screen.getByRole('button', { name: /start camera/i })).toBeTruthy();
  });

  it('shows a terminal, actionable error when permission is denied — never a spinner', async () => {
    const denied = Object.assign(new Error('no'), { name: 'NotAllowedError' });
    stubCamera(async () => {
      throw denied;
    });
    render(<ARMirror designs={designs} />);

    await clickAsync(screen.getByRole('button', { name: /start camera/i }));

    await waitFor(() => expect(screen.getByText(/permission denied/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    expect(screen.queryByText(/waiting for camera/i)).toBeNull();
  });

  it('tells an unsupported browser the truth instead of opening a dead viewport', async () => {
    vi.stubGlobal('navigator', {});
    render(<ARMirror designs={designs} />);

    await clickAsync(screen.getByRole('button', { name: /start camera/i }));

    await waitFor(() => expect(screen.getByText(/can't open a camera/i)).toBeTruthy());
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('renders the overlay for flash art on white', async () => {
    installImageStub();
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={designs} />);
    await startCamera();

    await clickAsync(screen.getByTitle('Flash art'));

    await waitFor(() => expect(screen.getByRole('slider', { name: /size/i })).toBeTruthy());
  });

  it('BLOCKS an on-skin render and explains why, drawing no overlay', async () => {
    installImageStub();
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={designs} />);
    await startCamera();

    await clickAsync(screen.getByTitle('On-skin render'));

    await waitFor(() => expect(screen.getByText(/rendered onto skin/i)).toBeTruthy());
    // No transform controls means nothing was composited.
    expect(screen.queryByRole('slider', { name: /size/i })).toBeNull();
  });

  it('releases the camera on exit', async () => {
    const track = makeTrack();
    stubCamera(async () => ({ getTracks: () => [track] }));
    const onExit = vi.fn();
    render(<ARMirror designs={designs} onExit={onExit} />);
    await startCamera();

    await clickAsync(screen.getAllByRole('button')[0]);

    expect(track.stop).toHaveBeenCalled();
    expect(onExit).toHaveBeenCalled();
  });

  it('releases the camera when unmounted mid-session', async () => {
    const track = makeTrack();
    stubCamera(async () => ({ getTracks: () => [track] }));
    const { unmount } = render(<ARMirror designs={designs} />);
    await startCamera();

    act(() => unmount());

    expect(track.stop).toHaveBeenCalled();
  });

  it('says so plainly when there are no designs to place', async () => {
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={[]} />);
    await startCamera();

    expect(screen.getByText(/no generated designs yet/i)).toBeTruthy();
  });

  it('preselects the carried-in design so the overlay is up without a tray tap', async () => {
    installImageStub();
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={designs} initialSelectedId="a" />);
    await startCamera();

    // The flash design composites straight away — transform controls appear
    // without the user ever touching the tray.
    await waitFor(() => expect(screen.getByRole('slider', { name: /size/i })).toBeTruthy());
  });

  it('ignores an initialSelectedId that is not in the tray', async () => {
    installImageStub();
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={designs} initialSelectedId="ghost" />);
    await startCamera();

    expect(screen.queryByRole('slider', { name: /size/i })).toBeNull();
  });

  it('offers the funnel-forward Find-your-artist door when a href is provided', async () => {
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={designs} findArtistHref="/smart-match?ds=sess-1" />);

    const links = screen.getAllByRole('link', { name: /find your artist/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].getAttribute('href')).toBe('/smart-match?ds=sess-1');
  });

  it('renders no forward door without a href (exit stays the only chrome)', () => {
    stubCamera(async () => ({ getTracks: () => [makeTrack()] }));
    render(<ARMirror designs={designs} />);
    expect(screen.queryByRole('link', { name: /find your artist/i })).toBeNull();
  });
});

/** Boot the mirror to a live camera with the flash overlay composited. */
async function startWithOverlay(nav?: Record<string, unknown>) {
  installImageStub();
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [makeTrack()] })) },
    ...nav,
  });
  render(<ARMirror designs={designs} initialSelectedId="a" />);
  await startCamera();
  await waitFor(() => expect(screen.getByRole('button', { name: /snap it/i })).toBeTruthy());
}

describe('ARMirror placement guides', () => {
  it('is OFF by default — the mirror never draws on the body uninvited', async () => {
    await startWithOverlay();
    expect(screen.queryByTestId('placement-guide')).toBeNull();
    expect(screen.getByRole('button', { name: /guides: off/i })).toBeTruthy();
  });

  it('cycles forearm → wrist → upper arm → off, with a hint while on', async () => {
    await startWithOverlay();
    const toggle = () => screen.getByRole('button', { name: /guides:/i });

    await clickAsync(toggle());
    expect(screen.getByTestId('placement-guide').getAttribute('data-guide')).toBe('forearm');
    expect(screen.getByText(/line your forearm up/i)).toBeTruthy();

    await clickAsync(toggle());
    expect(screen.getByTestId('placement-guide').getAttribute('data-guide')).toBe('wrist');

    await clickAsync(toggle());
    expect(screen.getByTestId('placement-guide').getAttribute('data-guide')).toBe('upper-arm');

    await clickAsync(toggle());
    expect(screen.queryByTestId('placement-guide')).toBeNull();
  });
});

describe('ARMirror capture & share loop', () => {
  it('offers the clip button only when the browser can record', async () => {
    await startWithOverlay();
    expect(screen.getByRole('button', { name: /3-sec clip/i })).toBeTruthy();
  });

  it('hides the clip button on browsers that cannot record — stills only, no dead button', async () => {
    captureMocks.clipSupported = false;
    await startWithOverlay();
    expect(screen.queryByRole('button', { name: /3-sec clip/i })).toBeNull();
    expect(screen.getByRole('button', { name: /snap it/i })).toBeTruthy();
  });

  it('a snap produces a local capture waiting on an explicit exit — nothing auto-downloads', async () => {
    await startWithOverlay();
    await clickAsync(screen.getByRole('button', { name: /snap it/i }));

    await waitFor(() => expect(screen.getByText(/got the shot/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /send it to the group chat/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /save it/i })).toBeTruthy();
    // The capture exists only in memory until the user picks a door.
    expect(captureMocks.downloadBlob).not.toHaveBeenCalled();
  });

  it('a clip records through the canvas recorder and lands in the same card', async () => {
    await startWithOverlay();
    await clickAsync(screen.getByRole('button', { name: /3-sec clip/i }));

    await waitFor(() => expect(screen.getByText(/got the clip/i)).toBeTruthy());
    expect(captureMocks.recordCanvasClip).toHaveBeenCalledOnce();
  });

  it('"save it" downloads locally', async () => {
    await startWithOverlay();
    await clickAsync(screen.getByRole('button', { name: /snap it/i }));
    await waitFor(() => expect(screen.getByText(/got the shot/i)).toBeTruthy());

    await clickAsync(screen.getByRole('button', { name: /save it/i }));
    expect(captureMocks.downloadBlob).toHaveBeenCalledOnce();
    const [, filename] = captureMocks.downloadBlob.mock.calls[0];
    expect(filename).toMatch(/^tatt-ar-still-\d+\.png$/);
  });

  it('send uses the OS share sheet with the capture, the ask, and the design link', async () => {
    captureMocks.shareLink = 'https://t.example/share/s1';
    const share = vi.fn(async () => {});
    await startWithOverlay({ share, canShare: () => true });

    await clickAsync(screen.getByRole('button', { name: /snap it/i }));
    await waitFor(() => expect(screen.getByText(/got the shot/i)).toBeTruthy());
    await clickAsync(screen.getByRole('button', { name: /send it to the group chat/i }));

    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    const data = share.mock.calls[0][0] as ShareData;
    expect(data.files?.[0]?.name).toMatch(/^tatt-ar-still-\d+\.png$/);
    expect(data.text).toMatch(/should I get/i);
    expect(data.url).toBe('https://t.example/share/s1');
    await waitFor(() => expect(screen.getByText(/sent\. now let them argue/i)).toBeTruthy());
    // The share sheet is the exit — no parallel download.
    expect(captureMocks.downloadBlob).not.toHaveBeenCalled();
  });

  it('falls back to download + guidance when the browser has no file share', async () => {
    await startWithOverlay(); // navigator without share/canShare
    await clickAsync(screen.getByRole('button', { name: /snap it/i }));
    await waitFor(() => expect(screen.getByText(/got the shot/i)).toBeTruthy());

    await clickAsync(screen.getByRole('button', { name: /send it to the group chat/i }));

    await waitFor(() => expect(captureMocks.downloadBlob).toHaveBeenCalledOnce());
    expect(screen.getByText(/no share sheet on this browser/i)).toBeTruthy();
  });

  it('switching designs discards the capture — a shot of design A must not ship as design B', async () => {
    await startWithOverlay();
    await clickAsync(screen.getByRole('button', { name: /snap it/i }));
    await waitFor(() => expect(screen.getByText(/got the shot/i)).toBeTruthy());

    await clickAsync(screen.getByTitle('On-skin render'));

    await waitFor(() => expect(screen.queryByText(/got the shot/i)).toBeNull());
  });
});
