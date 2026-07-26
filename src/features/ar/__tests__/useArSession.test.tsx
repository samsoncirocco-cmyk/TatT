import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useArSession } from '../useArSession';

function makeTrack() {
  return { kind: 'video', stop: vi.fn() };
}

function makeStream(tracks = [makeTrack()]) {
  return { getTracks: () => tracks } as unknown as MediaStream;
}

/** Minimal stand-in for the <video> the hook drives. */
function makeVideoRef() {
  const el = {
    readyState: 1, // metadata already available — the common real-world case
    srcObject: null as unknown,
    onloadedmetadata: null as null | (() => void),
    onerror: null as null | ((e: unknown) => void),
    play: vi.fn().mockResolvedValue(undefined),
  };
  return { current: el as unknown as HTMLVideoElement, el };
}

function stubCamera(impl: () => Promise<MediaStream>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(impl) } });
  vi.stubGlobal('isSecureContext', true);
}

describe('useArSession', () => {
  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts idle', () => {
    stubCamera(async () => makeStream());
    const { result } = renderHook(() => useArSession(makeVideoRef()));
    expect(result.current.status).toBe('idle');
  });

  it('reaches active on a successful start', async () => {
    stubCamera(async () => makeStream());
    const ref = makeVideoRef();
    const { result } = renderHook(() => useArSession(ref));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('active');
    expect(ref.el.srcObject).not.toBeNull();
    expect(ref.el.play).toHaveBeenCalled();
  });

  it('reports permission denial as a terminal error, not a spinner', async () => {
    const denied = Object.assign(new Error('no'), { name: 'NotAllowedError' });
    stubCamera(async () => {
      throw denied;
    });
    const { result } = renderHook(() => useArSession(makeVideoRef()));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.reason).toBe('permission-denied');
    expect(result.current.message).toMatch(/permission/i);
  });

  it('reports an unsupported browser without ever calling getUserMedia', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('isSecureContext', true);
    const { result } = renderHook(() => useArSession(makeVideoRef()));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('unsupported');
    expect(result.current.reason).toBe('no-camera-api');
  });

  it('stop() releases every track and returns to idle', async () => {
    const tracks = [makeTrack()];
    stubCamera(async () => makeStream(tracks));
    const ref = makeVideoRef();
    const { result } = renderHook(() => useArSession(ref));

    await act(async () => {
      await result.current.start();
    });
    act(() => {
      result.current.stop();
    });

    expect(tracks[0].stop).toHaveBeenCalled();
    expect(ref.el.srcObject).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('releases the camera when the component unmounts', async () => {
    const tracks = [makeTrack()];
    stubCamera(async () => makeStream(tracks));
    const { result, unmount } = renderHook(() => useArSession(makeVideoRef()));

    await act(async () => {
      await result.current.start();
    });
    unmount();

    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it('does not open a second camera when start() is called twice', async () => {
    stubCamera(async () => makeStream());
    const { result } = renderHook(() => useArSession(makeVideoRef()));

    await act(async () => {
      await Promise.all([result.current.start(), result.current.start()]);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('tears down a stream that arrives after the user already cancelled', async () => {
    // The camera light bug: tap Start, tap Cancel, and the getUserMedia
    // promise resolves afterwards. Nothing owns that stream, so without an
    // explicit check the camera stays on until the tab closes.
    const tracks = [makeTrack()];
    let release!: (s: MediaStream) => void;
    stubCamera(
      () =>
        new Promise<MediaStream>((resolve) => {
          release = resolve;
        }),
    );

    const { result } = renderHook(() => useArSession(makeVideoRef()));

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.start();
    });
    act(() => {
      result.current.stop();
    });

    await act(async () => {
      release(makeStream(tracks));
      await pending;
    });

    expect(tracks[0].stop).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('surfaces a stalled camera as an error rather than hanging in starting', async () => {
    // Stream opens but never reports metadata.
    const ref = makeVideoRef();
    ref.el.readyState = 0;
    stubCamera(async () => makeStream());

    vi.useFakeTimers();
    const { result } = renderHook(() => useArSession(ref));

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.start();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
      await pending;
    });
    vi.useRealTimers();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.reason).toBe('stream-timeout');
  });
});
