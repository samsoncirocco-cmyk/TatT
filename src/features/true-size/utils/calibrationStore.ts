/**
 * Screen-calibration persistence. One screen, one number: calibrate once,
 * every design on this device renders true-size from then on.
 *
 * localStorage is the right home — the calibration describes THIS screen,
 * not the user or the design, so it must not travel with an account. A
 * stored value is re-validated on read: a corrupt or implausible entry is
 * treated as "never calibrated", never as a wrong-size render.
 */

import { isPlausiblePxPerMm } from "./trueSizeMath";

export const CALIBRATION_STORAGE_KEY = "tatt.trueSize.calibration.v1";

export type TrueSizeCalibration = {
  /** Screen pixels per physical millimetre, from the card match. */
  pxPerMm: number;
  /** Epoch ms — shown as provenance, never used to expire. */
  calibratedAt: number;
};

export function loadCalibration(): TrueSizeCalibration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !isPlausiblePxPerMm((parsed as TrueSizeCalibration).pxPerMm)
    ) {
      return null;
    }
    const { pxPerMm, calibratedAt } = parsed as TrueSizeCalibration;
    return {
      pxPerMm,
      calibratedAt: typeof calibratedAt === "number" ? calibratedAt : 0,
    };
  } catch {
    return null;
  }
}

/** Returns the stored record, or null if the value was implausible. */
export function saveCalibration(pxPerMm: number): TrueSizeCalibration | null {
  if (typeof window === "undefined") return null;
  if (!isPlausiblePxPerMm(pxPerMm)) return null;
  const record: TrueSizeCalibration = { pxPerMm, calibratedAt: Date.now() };
  try {
    window.localStorage.setItem(
      CALIBRATION_STORAGE_KEY,
      JSON.stringify(record)
    );
    return record;
  } catch {
    // Private mode / quota — the session still works, it just won't persist.
    return record;
  }
}

export function clearCalibration(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
