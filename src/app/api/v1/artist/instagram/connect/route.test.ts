import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyFirebaseToken: vi.fn(),
  isArtistOwner: vi.fn(),
  executeServerCypherQuery: vi.fn(),
  stateSet: vi.fn(),
  replacePosts: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({ verifyApiAuth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth-dal", () => ({
  verifyFirebaseToken: mocks.verifyFirebaseToken,
}));
vi.mock("@/lib/artist-ownership", () => ({
  isArtistOwner: mocks.isArtistOwner,
}));
vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  executeServerCypherQuery: mocks.executeServerCypherQuery,
}));
vi.mock("@/lib/firebase-admin", () => ({ ensureAdminApp: () => true }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: () => ({ doc: () => ({ set: mocks.stateSet }) }),
  }),
}));
vi.mock("@/lib/artist-instagram-connection", () => ({
  getInstagramConnection: vi.fn().mockResolvedValue(null),
  disconnectInstagramConnection: mocks.disconnect,
}));
vi.mock("@/lib/artist-portfolio-posts", () => ({
  replaceArtistPortfolioPosts: mocks.replacePosts,
}));

import { DELETE, POST } from "./route";

function request(method: "POST" | "DELETE", body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/v1/artist/instagram/connect", {
    method,
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("INSTAGRAM_APP_ID", "app-1");
  vi.stubEnv("INSTAGRAM_APP_SECRET", "secret");
  mocks.verifyFirebaseToken.mockResolvedValue({ uid: "uid-1" });
  mocks.isArtistOwner.mockResolvedValue(true);
  mocks.executeServerCypherQuery.mockResolvedValue([{ instagram: "@sam.ink" }]);
  mocks.stateSet.mockResolvedValue(undefined);
  mocks.replacePosts.mockResolvedValue([]);
  mocks.disconnect.mockResolvedValue(true);
});

describe("Instagram connect route", () => {
  it("refuses to mint OAuth state for anyone but the verified profile owner", async () => {
    mocks.isArtistOwner.mockResolvedValue(false);
    const response = await POST(request("POST", { artistId: "artist_1" }));
    expect(response.status).toBe(403);
    expect(mocks.stateSet).not.toHaveBeenCalled();
  });

  it("binds OAuth state to the locked Instagram identity", async () => {
    const response = await POST(request("POST", { artistId: "artist_1" }));
    expect(response.status).toBe(200);
    expect(mocks.stateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: "artist_1",
        uid: "uid-1",
        expectedUsername: "sam.ink",
        used: false,
      }),
    );
    const body = await response.json();
    const url = new URL(body.authorizeUrl);
    expect(url.searchParams.get("scope")).toBe("instagram_business_basic");
    expect(url.searchParams.get("state")).toBeTruthy();
  });

  it("withdraws selected posts before discarding the connection", async () => {
    const response = await DELETE(request("DELETE", { artistId: "artist_1" }));
    expect(response.status).toBe(200);
    expect(mocks.replacePosts).toHaveBeenCalledWith({
      artistId: "artist_1",
      uid: "uid-1",
      media: [],
    });
    expect(mocks.disconnect).toHaveBeenCalledWith("artist_1");
  });
});
