import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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
const originalPlay = Object.getOwnPropertyDescriptor(mediaProto, 'play');
const originalReadyState = Object.getOwnPropertyDescriptor(mediaProto, 'readyState');

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true);
  // jsdom has no media element playback.
  Object.defineProperty(mediaProto, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(mediaProto, 'readyState', {
    configurable: true,
    get: () => 1,
  });
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
