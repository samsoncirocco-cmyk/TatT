import { describe, it, expect, beforeEach } from "vitest";
import { hasEverAuthed, STORAGE_KEYS } from "@/lib/tattStorage";

describe("hasEverAuthed", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns false for a brand-new visitor", () => {
    expect(hasEverAuthed()).toBe(false);
  });

  it("returns true once the hasAuthed flag has been set", () => {
    window.localStorage.setItem(STORAGE_KEYS.hasAuthed, JSON.stringify(true));
    expect(hasEverAuthed()).toBe(true);
  });

  it("stays true even after the user record is cleared (sign-out)", () => {
    window.localStorage.setItem(STORAGE_KEYS.hasAuthed, JSON.stringify(true));
    window.localStorage.removeItem(STORAGE_KEYS.user);
    expect(hasEverAuthed()).toBe(true);
  });
});
