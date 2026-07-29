import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  exchangeCode: vi.fn(),
  exchangeLong: vi.fn(),
  fetchProfile: vi.fn(),
  saveConnection: vi.fn(),
  markVerified: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({ ensureAdminApp: () => true }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: () => ({ doc: () => ({}) }),
    runTransaction: mocks.transaction,
  }),
}));
vi.mock("@/lib/artist-instagram", async () => {
  const actual = await vi.importActual<typeof import("@/lib/artist-instagram")>(
    "@/lib/artist-instagram",
  );
  return {
    ...actual,
    exchangeInstagramCode: mocks.exchangeCode,
    exchangeForLongLivedInstagramToken: mocks.exchangeLong,
    fetchInstagramProfile: mocks.fetchProfile,
  };
});
vi.mock("@/lib/artist-instagram-connection", () => ({
  saveInstagramConnection: mocks.saveConnection,
}));
vi.mock("@/lib/artist-portfolio-posts", () => ({
  markInstagramOAuthVerified: mocks.markVerified,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("INSTAGRAM_APP_ID", "app-1");
  vi.stubEnv("INSTAGRAM_APP_SECRET", "secret");
  mocks.transaction.mockImplementation(async (work) =>
    work({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          artistId: "artist_1",
          uid: "uid-1",
          expectedUsername: "sam.ink",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          used: false,
        }),
      }),
      update: vi.fn(),
    }),
  );
  mocks.exchangeCode.mockResolvedValue({
    ok: true,
    accessToken: "short",
    userId: "ig-1",
  });
  mocks.exchangeLong.mockResolvedValue({
    ok: true,
    accessToken: "long",
    expiresInSeconds: 5_000,
  });
  mocks.saveConnection.mockResolvedValue({ ok: true });
  mocks.markVerified.mockResolvedValue(true);
});

describe("Instagram OAuth callback", () => {
  it("rejects a connected account that does not match the profile identity", async () => {
    mocks.fetchProfile.mockResolvedValue({
      userId: "ig-attacker",
      username: "someone.else",
      accountType: "CREATOR",
    });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/artist/instagram/callback?state=s&code=c",
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("reason=account_mismatch");
    expect(mocks.saveConnection).not.toHaveBeenCalled();
    expect(mocks.markVerified).not.toHaveBeenCalled();
  });

  it("stores the credential only after the account identity matches", async () => {
    mocks.fetchProfile.mockResolvedValue({
      userId: "ig-1",
      username: "SAM.INK",
      accountType: "CREATOR",
    });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/artist/instagram/callback?state=s&code=c",
      ),
    );
    expect(response.headers.get("location")).toContain("instagram=connected");
    expect(mocks.saveConnection).toHaveBeenCalledWith(
      expect.objectContaining({ artistId: "artist_1", accessToken: "long" }),
    );
    expect(mocks.markVerified).toHaveBeenCalledWith(
      expect.objectContaining({ artistId: "artist_1", uid: "uid-1" }),
    );
  });

  it("returns to the profile when Instagram is temporarily unavailable", async () => {
    mocks.exchangeCode.mockRejectedValue(new Error("network unavailable"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/artist/instagram/callback?state=s&code=c",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("reason=provider_unavailable");
    expect(mocks.saveConnection).not.toHaveBeenCalled();
  });
});
