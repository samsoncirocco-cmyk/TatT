import { describe, expect, it } from "vitest";
import {
  INSTAGRAM_BASIC_SCOPE,
  buildInstagramAuthorizeUrl,
  canonicalInstagramPermalink,
  exchangeInstagramCode,
  fetchInstagramMedia,
  fetchInstagramProfile,
} from "./artist-instagram";

const config = {
  appId: "123",
  appSecret: "secret",
  redirectUri: "https://tatttester.com/api/v1/artist/instagram/callback",
};

describe("Instagram OAuth", () => {
  it("requests only the basic professional-account scope with CSRF state", () => {
    const url = new URL(buildInstagramAuthorizeUrl({ ...config, state: "state-1" }));
    expect(`${url.origin}${url.pathname}`).toBe("https://www.instagram.com/oauth/authorize");
    expect(url.searchParams.get("scope")).toBe(INSTAGRAM_BASIC_SCOPE);
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
  });

  it("exchanges the callback code without leaking the secret into the URL", async () => {
    let seenUrl = "";
    let seenBody = "";
    const result = await exchangeInstagramCode({
      config,
      code: "code#_",
      fetchFn: (async (url, init) => {
        seenUrl = String(url);
        seenBody = String(init?.body);
        return Response.json({ access_token: "short", user_id: "42" });
      }) as typeof fetch,
    });
    expect(result).toEqual({ ok: true, accessToken: "short", userId: "42" });
    expect(seenUrl).not.toContain("secret");
    expect(seenBody).toContain("client_secret=secret");
    expect(seenBody).toContain("code=code");
  });
});
describe("Instagram media normalization", () => {
  it("accepts only canonical post, reel, and tv permalinks", () => {
    expect(canonicalInstagramPermalink("https://instagram.com/p/Ab_c-1/?x=1")).toBe(
      "https://www.instagram.com/p/Ab_c-1/",
    );
    expect(canonicalInstagramPermalink("https://www.instagram.com/reel/ABC/")).toBe(
      "https://www.instagram.com/reel/ABC/",
    );
    expect(canonicalInstagramPermalink("https://instagram.com/someone")).toBeNull();
  });

  it("reads the connected account without putting the token in the URL", async () => {
    let seenUrl = "";
    let authorization = "";
    const profile = await fetchInstagramProfile({
      accessToken: "token",
      fetchFn: (async (url, init) => {
        seenUrl = String(url);
        authorization = String((init?.headers as Record<string, string>)?.Authorization);
        return Response.json({ user_id: "42", username: "ink.artist", account_type: "CREATOR" });
      }) as typeof fetch,
    });
    expect(profile?.username).toBe("ink.artist");
    expect(seenUrl).not.toContain("token");
    expect(authorization).toBe("Bearer token");
  });

  it("drops malformed media rows and returns safe selection data", async () => {
    const media = await fetchInstagramMedia({
      accessToken: "token",
      fetchFn: (async () =>
        Response.json({
          data: [
            {
              id: "1",
              permalink: "https://instagram.com/p/ABC/",
              media_type: "IMAGE",
              media_url: "https://cdn.example/image.jpg",
              caption: "work",
            },
            { id: "2", permalink: "https://example.com/not-instagram" },
          ],
        })) as typeof fetch,
    });
    expect(media).toHaveLength(1);
    expect(media?.[0]).toMatchObject({
      id: "1",
      permalink: "https://www.instagram.com/p/ABC/",
      mediaType: "IMAGE",
    });
  });
});
