import { describe, it, expect, beforeEach } from "vitest";
import {
  CALIBRATION_STORAGE_KEY,
  clearCalibration,
  loadCalibration,
  saveCalibration,
} from "./calibrationStore";

describe("calibration persistence (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts uncalibrated", () => {
    expect(loadCalibration()).toBeNull();
  });

  it("round-trips a calibration", () => {
    const saved = saveCalibration(4.2);
    expect(saved).not.toBeNull();
    const loaded = loadCalibration();
    expect(loaded?.pxPerMm).toBe(4.2);
    expect(loaded?.calibratedAt).toBe(saved?.calibratedAt);
  });

  it("persists under the versioned key", () => {
    saveCalibration(4.2);
    const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).pxPerMm).toBe(4.2);
  });

  it("refuses to store an implausible calibration", () => {
    expect(saveCalibration(0)).toBeNull();
    expect(saveCalibration(NaN)).toBeNull();
    expect(loadCalibration()).toBeNull();
  });

  it("treats corrupt stored JSON as never-calibrated", () => {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, "{not json");
    expect(loadCalibration()).toBeNull();
  });

  it("treats an implausible stored value as never-calibrated", () => {
    // e.g. a stale record written by a buggy build — a wrong-size render
    // is worse than re-asking for the card.
    window.localStorage.setItem(
      CALIBRATION_STORAGE_KEY,
      JSON.stringify({ pxPerMm: 9999, calibratedAt: 1 })
    );
    expect(loadCalibration()).toBeNull();
  });

  it("clears", () => {
    saveCalibration(4.2);
    clearCalibration();
    expect(loadCalibration()).toBeNull();
  });
});
