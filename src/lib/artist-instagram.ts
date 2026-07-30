/**
 * Instagram API with Instagram Login.
 *
 * This integration deliberately requests only `instagram_business_basic`.
 * It can read media owned by the connecting Professional/Creator account; it
 * cannot read personal accounts or arbitrary public profiles.
 */

export const INSTAGRAM_BASIC_SCOPE = "instagram_business_basic";
const AUTH_ENDPOINT = "https://www.instagram.com/oauth/authorize";
const TOKEN_ENDPOINT = "https://api.instagram.com/oauth/access_token";
const GRAPH_ORIGIN = "https://graph.instagram.com";

export type InstagramOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

export type InstagramProfile = {
  userId: string;
  username: string;
  accountType: string | null;
};

export type InstagramMedia = {
  id: string;
  permalink: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  timestamp: string | null;
};

type FetchLike = typeof fetch;

export function instagramOAuthConfig(baseUrl?: string): InstagramOAuthConfig | null {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) return null;
  const origin = (
    baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return {
    appId,
    appSecret,
    redirectUri: `${origin}/api/v1/artist/instagram/callback`,
  };
}

export function buildInstagramAuthorizeUrl(
  config: InstagramOAuthConfig & { state: string },
): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", INSTAGRAM_BASIC_SCOPE);
  url.searchParams.set("state", config.state);
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  return url.toString();
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function exchangeInstagramCode(input: {
  config: InstagramOAuthConfig;
  code: string;
  fetchFn?: FetchLike;
}): Promise<
  | { ok: true; accessToken: string; userId: string }
  | { ok: false; reason: string }
> {
  const body = new URLSearchParams({
    client_id: input.config.appId,
    client_secret: input.config.appSecret,
    grant_type: "authorization_code",
    redirect_uri: input.config.redirectUri,
    code: input.code.replace(/#_$/, ""),
  });
  const response = await (input.fetchFn ?? fetch)(TOKEN_ENDPOINT, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
  });
  const data = await responseJson(response);
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  const userId = String(data.user_id ?? "");
  if (!response.ok || !accessToken || !userId) {
    return { ok: false, reason: `token_exchange_${response.status}` };
  }
  return { ok: true, accessToken, userId };
}

export async function exchangeForLongLivedInstagramToken(input: {
  config: InstagramOAuthConfig;
  accessToken: string;
  fetchFn?: FetchLike;
}): Promise<
  | { ok: true; accessToken: string; expiresInSeconds: number }
  | { ok: false; reason: string }
> {
  const url = new URL(`${GRAPH_ORIGIN}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", input.config.appSecret);
  url.searchParams.set("access_token", input.accessToken);
  const response = await (input.fetchFn ?? fetch)(url, { cache: "no-store" });
  const data = await responseJson(response);
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  const expiresInSeconds = Number(data.expires_in);
  if (!response.ok || !accessToken || !Number.isFinite(expiresInSeconds)) {
    return { ok: false, reason: `long_lived_exchange_${response.status}` };
  }
  return { ok: true, accessToken, expiresInSeconds };
}

export async function refreshLongLivedInstagramToken(input: {
  accessToken: string;
  fetchFn?: FetchLike;
}): Promise<
  | { ok: true; accessToken: string; expiresInSeconds: number }
  | { ok: false; reason: string }
> {
  const url = new URL(`${GRAPH_ORIGIN}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", input.accessToken);
  const response = await (input.fetchFn ?? fetch)(url, { cache: "no-store" });
  const data = await responseJson(response);
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  const expiresInSeconds = Number(data.expires_in);
  if (!response.ok || !accessToken || !Number.isFinite(expiresInSeconds)) {
    return { ok: false, reason: `token_refresh_${response.status}` };
  }
  return { ok: true, accessToken, expiresInSeconds };
}

export async function fetchInstagramProfile(input: {
  accessToken: string;
  fetchFn?: FetchLike;
}): Promise<InstagramProfile | null> {
  const url = new URL(`${GRAPH_ORIGIN}/me`);
  url.searchParams.set("fields", "user_id,username,account_type");
  const response = await (input.fetchFn ?? fetch)(url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: "no-store",
  });
  const data = await responseJson(response);
  const username = typeof data.username === "string" ? data.username : "";
  const userId = String(data.user_id ?? data.id ?? "");
  if (!response.ok || !username || !userId) return null;
  return {
    userId,
    username,
    accountType: typeof data.account_type === "string" ? data.account_type : null,
  };
}

export function canonicalInstagramPermalink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = raw
    .trim()
    .match(/^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i);
  if (!match) return null;
  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
}

export async function fetchInstagramMedia(input: {
  accessToken: string;
  limit?: number;
  fetchFn?: FetchLike;
}): Promise<InstagramMedia[] | null> {
  const url = new URL(`${GRAPH_ORIGIN}/me/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp",
  );
  url.searchParams.set("limit", String(Math.min(100, Math.max(1, input.limit ?? 50))));
  const response = await (input.fetchFn ?? fetch)(url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: "no-store",
  });
  const body = await responseJson(response);
  if (!response.ok || !Array.isArray(body.data)) return null;
  const media: InstagramMedia[] = [];
  for (const raw of body.data as Array<Record<string, unknown>>) {
    const id = String(raw.id ?? "");
    const permalink = canonicalInstagramPermalink(raw.permalink);
    if (!id || !permalink) continue;
    media.push({
      id,
      permalink,
      mediaType: typeof raw.media_type === "string" ? raw.media_type : "UNKNOWN",
      mediaUrl: typeof raw.media_url === "string" ? raw.media_url : null,
      thumbnailUrl: typeof raw.thumbnail_url === "string" ? raw.thumbnail_url : null,
      caption: typeof raw.caption === "string" ? raw.caption : null,
      timestamp: typeof raw.timestamp === "string" ? raw.timestamp : null,
    });
  }
  return media;
}
