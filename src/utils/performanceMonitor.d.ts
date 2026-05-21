/**
 * Type declarations for the performance monitor (.js companion).
 * Replaces the @ts-ignore in src/app/api/v1/stencil/export/route.ts.
 */

export function startTimer(opName: string): void;
export function endTimer(
  opName: string,
  threshold?: number | null,
  metadata?: Record<string, unknown>,
): number;
export function logFrame(frameDuration: number): void;

export interface PerfStats {
  avg: string;
  min: string;
  max: string;
  count: number;
}

export function getStats(): Record<string, PerfStats>;

declare const performanceMonitor: {
  startTimer: typeof startTimer;
  endTimer: typeof endTimer;
  logFrame: typeof logFrame;
  getStats: typeof getStats;
};

export default performanceMonitor;
