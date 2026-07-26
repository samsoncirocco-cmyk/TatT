/**
 * session-types-persistence — ownership scoping and write validation.
 *
 * The point of this file is the cross-artist attack test: a session-type id
 * must not be a capability. To test that honestly we need a fake that can
 * actually distinguish a scoped query from an unscoped one, so `fakeGraph`
 * interprets the two Cypher shapes this module emits:
 *
 *   MATCH (:Artist {id: $artistId})-[:OFFERS]->(st:SessionType {id: $id})
 *     → matches only when the stored owner equals params.artistId
 *   MATCH (st:SessionType {id: $id})
 *     → matches on id alone, whoever owns it
 *
 * So if the scoping clause is ever removed from the query, the attack test
 * below goes green-to-red on its own rather than silently passing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

type Node = Record<string, unknown> & { id: string; artistId: string };

const graph: { artists: Set<string>; sessionTypes: Map<string, Node> } = {
  artists: new Set(),
  sessionTypes: new Map(),
};

/** Records the exact queries the module issued, for scoping assertions. */
const issued: Array<{ query: string; params: Record<string, unknown> }> = [];

const SCOPED_MATCH = /MATCH\s*\(:Artist\s*\{id:\s*\$artistId\}\)-\[:OFFERS\]->/;

/**
 * Minimal Cypher interpreter covering only the statements this module emits.
 * Returns rows shaped like neo4j records (a `.get()` plus a plain `st` key).
 */
function runFakeCypher(query: string, params: Record<string, unknown>) {
  issued.push({ query, params });
  const artistId = params.artistId as string | undefined;
  const id = params.id as string | undefined;

  // --- createSessionType: MERGE on id, ON CREATE SET, ownership return ---
  if (query.includes("MERGE (st:SessionType {id: $id})")) {
    if (!artistId || !graph.artists.has(artistId)) return []; // MATCH (a:Artist) failed
    let node = graph.sessionTypes.get(id!);
    if (!node) {
      node = { id: id!, artistId } as Node;
      for (const [k, v] of Object.entries(params)) {
        if (k !== "id" && k !== "artistId") node[k] = v;
      }
      graph.sessionTypes.set(id!, node);
    }
    const ownedByCaller = node.artistId === artistId;
    return [{ id: node.id, ownedByCaller, get: (k: string) => (k === "id" ? node!.id : ownedByCaller) }];
  }

  const scoped = SCOPED_MATCH.test(query);
  const node = id ? graph.sessionTypes.get(id) : undefined;

  // --- getSessionTypesByArtist: traversal, no id ---
  if (!id && query.includes("[:OFFERS]->")) {
    const rows = [...graph.sessionTypes.values()]
      .filter((n) => n.artistId === artistId && n.isActive !== false)
      .map((n) => ({ st: { ...n } }));
    return rows;
  }

  // An unscoped query ignores artistId entirely — that is the bug shape.
  const matched = node && (!scoped || node.artistId === artistId);
  if (!matched) return [];

  // --- updateSessionType: SET ... RETURN st.id ---
  if (query.includes("SET ")) {
    for (const clause of query.split("SET ")[1].split("RETURN")[0].split(",")) {
      const m = clause.match(/st\.(\w+)\s*=\s*\$(\w+)/);
      if (m) node![m[1]] = params[m[2]];
    }
    return [{ id: node!.id, get: () => node!.id }];
  }

  // --- getSessionType: RETURN st ---
  return [{ st: { ...node! } }];
}

vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  executeServerCypherQuery: async (q: string, p: Record<string, unknown>) =>
    runFakeCypher(q, p),
}));

vi.mock("@/lib/neo4j", () => ({
  NEO4J_DATABASE: undefined,
  NEO4J_QUERY_TIMEOUT: 5000,
  getNeo4jDriver: () => ({
    session: () => ({
      executeWrite: async (
        work: (tx: {
          run: (q: string, p: Record<string, unknown>) => Promise<unknown>;
        }) => Promise<unknown>,
      ) =>
        work({
          run: async (q: string, p: Record<string, unknown>) => ({
            records: runFakeCypher(q, p),
          }),
        }),
      close: async () => {},
    }),
  }),
}));

import {
  createSessionType,
  getSessionType,
  getSessionTypesByArtist,
  updateSessionType,
  deactivateSessionType,
} from "./session-types-persistence";

const ARTIST_A = "artist-a";
const ARTIST_B = "artist-b";
const ST_ID = "st-1";

const createInput = {
  id: ST_ID,
  artistId: ARTIST_A,
  name: "Half day",
  slug: "half-day",
  durationMinutes: 240,
  depositType: "flat" as const,
  depositAmount: 15000,
};

beforeEach(async () => {
  graph.artists = new Set([ARTIST_A, ARTIST_B]);
  graph.sessionTypes = new Map();
  issued.length = 0;
  await createSessionType(createInput);
  issued.length = 0;
});

describe("createSessionType", () => {
  it("persists a session type owned by the artist", async () => {
    const record = await getSessionType({ artistId: ARTIST_A, id: ST_ID });
    expect(record?.name).toBe("Half day");
    expect(record?.artistId).toBe(ARTIST_A);
    expect(record?.depositAmount).toBe(15000);
  });

  it("refuses to create for an artist that does not exist", async () => {
    await expect(
      createSessionType({ ...createInput, id: "st-2", artistId: "ghost" }),
    ).rejects.toThrow(/Artist not found/);
  });

  it("refuses to hijack an id already owned by another artist", async () => {
    await expect(
      createSessionType({ ...createInput, artistId: ARTIST_B }),
    ).rejects.toThrow(/already owned by another artist/);
    expect(graph.sessionTypes.get(ST_ID)!.artistId).toBe(ARTIST_A);
  });
});

describe("updateSessionType — happy path", () => {
  it("lets the owning artist change name, duration and deposit", async () => {
    await updateSessionType(
      { artistId: ARTIST_A, id: ST_ID },
      { name: "Full day", durationMinutes: 480, depositType: "flat", depositAmount: 30000 },
    );
    const record = await getSessionType({ artistId: ARTIST_A, id: ST_ID });
    expect(record?.name).toBe("Full day");
    expect(record?.durationMinutes).toBe(480);
    expect(record?.depositAmount).toBe(30000);
  });

  it("scopes the write through the owning artist", async () => {
    await updateSessionType({ artistId: ARTIST_A, id: ST_ID }, { name: "Renamed" });
    const write = issued.find((q) => q.query.includes("SET "))!;
    expect(write.query).toMatch(SCOPED_MATCH);
    expect(write.params.artistId).toBe(ARTIST_A);
  });

  it("deactivates via the same scoped path", async () => {
    await deactivateSessionType({ artistId: ARTIST_A, id: ST_ID });
    expect(graph.sessionTypes.get(ST_ID)!.isActive).toBe(false);
    expect(await getSessionTypesByArtist(ARTIST_A)).toHaveLength(0);
  });
});

describe("updateSessionType — cross-artist attack (issue #154)", () => {
  it("does not let artist B rename artist A's session type", async () => {
    await expect(
      updateSessionType({ artistId: ARTIST_B, id: ST_ID }, { name: "Pwned" }),
    ).rejects.toThrow(/not found for this artist/);
    expect(graph.sessionTypes.get(ST_ID)!.name).toBe("Half day");
  });

  it("does not let artist B rewrite artist A's deposit", async () => {
    await expect(
      updateSessionType(
        { artistId: ARTIST_B, id: ST_ID },
        { depositType: "flat", depositAmount: 0 },
      ),
    ).rejects.toThrow(/not found for this artist/);
    expect(graph.sessionTypes.get(ST_ID)!.depositAmount).toBe(15000);
  });

  it("does not let artist B take artist A's session type offline", async () => {
    await expect(
      deactivateSessionType({ artistId: ARTIST_B, id: ST_ID }),
    ).rejects.toThrow(/not found for this artist/);
    expect(graph.sessionTypes.get(ST_ID)!.isActive).not.toBe(false);
  });

  it("does not let artist B read artist A's session type", async () => {
    expect(await getSessionType({ artistId: ARTIST_B, id: ST_ID })).toBeNull();
  });

  it("does not let artist B reassign ownership to themselves", async () => {
    await expect(
      updateSessionType({ artistId: ARTIST_A, id: ST_ID }, { artistId: ARTIST_B }),
    ).rejects.toThrow(/artistId cannot be changed/);
    expect(graph.sessionTypes.get(ST_ID)!.artistId).toBe(ARTIST_A);
  });

  it("reports the same error for an unknown id as for someone else's id", async () => {
    const foreign = await updateSessionType(
      { artistId: ARTIST_B, id: ST_ID },
      { name: "x" },
    ).catch((e: Error) => e.message.replace(ST_ID, "ID"));
    const unknown = await updateSessionType(
      { artistId: ARTIST_B, id: "st-nope" },
      { name: "x" },
    ).catch((e: Error) => e.message.replace("st-nope", "ID"));
    expect(foreign).toBe(unknown);
  });

  it("refuses a scope with a blank artistId rather than matching on id alone", async () => {
    await expect(
      updateSessionType({ artistId: "", id: ST_ID }, { name: "Pwned" }),
    ).rejects.toThrow(/artistId is required/);
    expect(issued.some((q) => q.query.includes("SET "))).toBe(false);
  });
});

describe("updateSessionType — write validation (issue #155)", () => {
  const ref = { artistId: ARTIST_A, id: ST_ID };

  it("rejects a partial refund above 100%", async () => {
    await expect(
      updateSessionType(ref, { cancellationPolicyPartialRefundBps: 15000 }),
    ).rejects.toThrow(/0-10000 bps/);
  });

  it("accepts a partial refund at exactly 100%", async () => {
    await updateSessionType(ref, { cancellationPolicyPartialRefundBps: 10000 });
    const record = await getSessionType(ref);
    expect(record?.cancellationPolicyPartialRefundBps).toBe(10000);
  });

  it("rejects a malformed slug, which the old update path let through", async () => {
    await expect(updateSessionType(ref, { slug: "Not A Slug!" })).rejects.toThrow(
      /slug must be/,
    );
  });

  it("rejects an over-long name, which the old update path let through", async () => {
    await expect(
      updateSessionType(ref, { name: "x".repeat(101) }),
    ).rejects.toThrow(/max 100 chars/);
  });

  it("rejects a deposit amount sent without its unit-defining type", async () => {
    await expect(updateSessionType(ref, { depositAmount: 500 })).rejects.toThrow(
      /depositType must be supplied alongside depositAmount/,
    );
  });

  it("rejects a flat deposit above the $1000 cap", async () => {
    await expect(
      updateSessionType(ref, { depositType: "flat", depositAmount: 100001 }),
    ).rejects.toThrow(/0-100000 cents/);
  });

  it("rejects a percentage deposit above 100%", async () => {
    await expect(
      updateSessionType(ref, { depositType: "percentage", depositAmount: 10001 }),
    ).rejects.toThrow(/0-10000 bps/);
  });

  it("rejects an out-of-range duration", async () => {
    await expect(updateSessionType(ref, { durationMinutes: 5 })).rejects.toThrow(
      /15-720/,
    );
  });

  it("leaves the record untouched when validation fails", async () => {
    await expect(updateSessionType(ref, { durationMinutes: 5 })).rejects.toThrow();
    expect(graph.sessionTypes.get(ST_ID)!.durationMinutes).toBe(240);
  });
});

describe("getSessionTypesByArtist", () => {
  it("returns only the calling artist's session types", async () => {
    await createSessionType({ ...createInput, id: "st-b", artistId: ARTIST_B, slug: "b-thing" });
    const forA = await getSessionTypesByArtist(ARTIST_A);
    expect(forA.map((s) => s.id)).toEqual([ST_ID]);
  });
});
