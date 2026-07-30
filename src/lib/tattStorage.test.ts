// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useDesigns,
  useStylePreferences,
  STORAGE_KEYS,
} from "./tattStorage";

describe("useDesigns", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("addDesign persists to localStorage (auto-save, no separate save step)", () => {
    const { result } = renderHook(() => useDesigns());

    act(() => {
      result.current.addDesign("a dragon", { image: "data:image/png;base64,x" });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.designs) || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].prompt).toBe("a dragon");
    expect(stored[0].image).toBe("data:image/png;base64,x");
  });

  it("removeDesign deletes the underlying stored record, not just hides it", () => {
    const { result } = renderHook(() => useDesigns());
    let id = "";

    act(() => {
      id = result.current.addDesign("a wolf").id;
    });
    expect(result.current.designs.some((d) => d.id === id)).toBe(true);

    act(() => {
      result.current.removeDesign(id);
    });

    expect(result.current.designs.some((d) => d.id === id)).toBe(false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.designs) || "[]");
    expect(stored.some((d: { id: string }) => d.id === id)).toBe(false);
  });

  it("removeDesigns bulk-deletes exactly the given ids and keeps the rest", () => {
    const { result } = renderHook(() => useDesigns());
    const ids: string[] = [];

    act(() => {
      ids.push(result.current.addDesign("one").id);
      ids.push(result.current.addDesign("two").id);
      ids.push(result.current.addDesign("three").id);
    });
    expect(result.current.designs).toHaveLength(3);

    act(() => {
      result.current.removeDesigns([ids[0], ids[2]]);
    });

    expect(result.current.designs).toHaveLength(1);
    expect(result.current.designs[0].id).toBe(ids[1]);
  });

  it("removeDesigns is a no-op for an empty id list", () => {
    const { result } = renderHook(() => useDesigns());

    act(() => {
      result.current.addDesign("keep me");
    });
    expect(result.current.designs).toHaveLength(1);

    act(() => {
      result.current.removeDesigns([]);
    });

    expect(result.current.designs).toHaveLength(1);
  });
});

describe("useStylePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists a canonical, deduplicated taste profile", async () => {
    const { result } = renderHook(() => useStylePreferences());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.setStylePreferences([
        "Fine Line",
        "Blackwork",
        "Fine Line",
        "fineline",
        "not-a-style",
      ]);
    });

    expect(result.current.stylePreferences).toEqual(["Fine Line", "Blackwork"]);
    expect(
      JSON.parse(
        localStorage.getItem(STORAGE_KEYS.stylePreferences) || "[]",
      ),
    ).toEqual(["Fine Line", "Blackwork"]);
  });

  it("fails safely when the saved value is not a list", async () => {
    localStorage.setItem(
      STORAGE_KEYS.stylePreferences,
      JSON.stringify({ style: "Fine Line" }),
    );

    const { result } = renderHook(() => useStylePreferences());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.stylePreferences).toEqual([]);
  });
});
