import { describe, it, expect } from "vitest";
import { validateSessionTypeInput } from "./session-types";

const base = {
  artistId: "artist-1",
  name: "Half day",
  slug: "half-day",
  durationMinutes: 240,
};

describe("validateSessionTypeInput", () => {
  it("accepts default buffers", () => {
    const result = validateSessionTypeInput(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.beforeBufferMinutes).toBe(30);
      expect(result.value.afterBufferMinutes).toBe(30);
    }
  });

  it("rejects negative beforeBufferMinutes", () => {
    const result = validateSessionTypeInput({
      ...base,
      beforeBufferMinutes: -15,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/beforeBufferMinutes/);
    }
  });

  it("rejects negative afterBufferMinutes", () => {
    const result = validateSessionTypeInput({
      ...base,
      afterBufferMinutes: -1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/afterBufferMinutes/);
    }
  });
});
