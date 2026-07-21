// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useMatchStore } from "./useMatchStore";

describe("useMatchStore hydration", () => {
  beforeEach(() => {
    localStorage.clear();
    useMatchStore.setState({
      matches: [],
      currentMatchId: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      hasHydrated: false,
    });
  });

  it("starts unhydrated with an empty matches array", () => {
    const { matches, hasHydrated } = useMatchStore.getState();
    expect(hasHydrated).toBe(false);
    expect(matches).toEqual([]);
  });

  it("marks hasHydrated after persist rehydration finishes", async () => {
    localStorage.setItem(
      "tatt-match-storage",
      JSON.stringify({
        state: {
          matches: [
            {
              artistId: "a1",
              artistName: "Ink Nova",
              matchScore: 90,
              tags: ["neo-trad"],
            },
          ],
          currentMatchId: null,
          lastUpdated: 1,
        },
        version: 0,
      }),
    );

    await useMatchStore.persist.rehydrate();

    const { matches, hasHydrated } = useMatchStore.getState();
    expect(hasHydrated).toBe(true);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.artistName).toBe("Ink Nova");
  });

  it("marks hasHydrated even when storage is empty", async () => {
    await useMatchStore.persist.rehydrate();
    expect(useMatchStore.getState().hasHydrated).toBe(true);
    expect(useMatchStore.getState().matches).toEqual([]);
  });

  it("does not persist the hasHydrated flag", async () => {
    useMatchStore.setState({ hasHydrated: true });
    useMatchStore.getState().setMatches([
      {
        artistId: "a1",
        artistName: "Ink Nova",
        matchScore: 80,
        tags: [],
      },
    ]);

    // Give persist a tick to write
    await Promise.resolve();

    const raw = localStorage.getItem("tatt-match-storage");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.hasHydrated).toBeUndefined();
    expect(parsed.state.matches).toHaveLength(1);
  });
});
