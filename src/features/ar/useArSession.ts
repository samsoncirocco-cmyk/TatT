'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkArSupport,
  requestCameraAccess,
  attachStreamToVideo,
  stopCameraStream,
} from '@/services/ar/arService';

/**
 * Live camera session lifecycle for the AR mirror.
 *
 * Every path ends somewhere the UI can render: `active`, `unsupported`, or
 * `error` with a reason and a sentence the user can act on. There is no state
 * that means "still trying, indefinitely" — a spinner that never resolves is
 * the failure mode this hook exists to make impossible.
 */
export type ArStatus = 'idle' | 'requesting' | 'starting' | 'active' | 'unsupported' | 'error';

export interface ArSession {
  status: ArStatus;
  /** Machine-readable failure tag; null unless status is 'error' or 'unsupported'. */
  reason: string | null;
  /** User-facing sentence; empty unless something went wrong. */
  message: string;
  start: () => Promise<void>;
  stop: () => void;
}

interface VideoRefLike {
  current: HTMLVideoElement | null;
}

export function useArSession(videoRef: VideoRefLike): ArSession {
  const [status, setStatus] = useState<ArStatus>('idle');
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  /** Bumped by stop()/unmount so an in-flight start() knows it was abandoned. */
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, [videoRef]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    startingRef.current = false;
    releaseStream();
    if (mountedRef.current) {
      setStatus('idle');
      setReason(null);
      setMessage('');
    }
  }, [releaseStream]);

  const start = useCallback(async () => {
    // One camera at a time. A double-tap must not open two streams.
    if (startingRef.current || streamRef.current) return;

    const support = checkArSupport();
    if (!support.supported) {
      setStatus('unsupported');
      setReason(support.reason);
      setMessage(support.message);
      return;
    }

    const generation = generationRef.current;
    const abandoned = () => generation !== generationRef.current || !mountedRef.current;

    startingRef.current = true;
    setStatus('requesting');
    setReason(null);
    setMessage('');

    let stream: MediaStream;
    try {
      stream = await requestCameraAccess();
    } catch (error) {
      startingRef.current = false;
      if (abandoned()) return;
      const err = error as Error & { reason?: string };
      setStatus('error');
      setReason(err.reason ?? 'unknown');
      setMessage(err.message);
      return;
    }

    // The user may have cancelled while the permission prompt was up. Nobody
    // owns this stream now, so release it or the camera light stays on.
    if (abandoned()) {
      stopCameraStream(stream);
      startingRef.current = false;
      return;
    }

    streamRef.current = stream;
    setStatus('starting');

    try {
      const video = videoRef.current;
      if (!video) throw new Error('Video element is not mounted');
      await attachStreamToVideo(video, stream);
      if (abandoned()) {
        releaseStream();
        return;
      }
      await video.play();
    } catch (error) {
      startingRef.current = false;
      releaseStream();
      if (abandoned()) return;
      const err = error as Error & { reason?: string };
      setStatus('error');
      setReason(err.reason ?? 'unknown');
      setMessage(err.message);
      return;
    }

    startingRef.current = false;
    if (abandoned()) {
      releaseStream();
      return;
    }
    setStatus('active');
  }, [videoRef, releaseStream]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      // Unmount must hand the camera back. Nothing else will.
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  return { status, reason, message, start, stop };
}
