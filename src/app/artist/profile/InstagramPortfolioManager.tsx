"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Media = {
  id: string;
  permalink: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
};

type Status = {
  configured: boolean;
  connected: boolean;
  connection?: { username?: string } | null;
};

export default function InstagramPortfolioManager({
  artistId,
}: {
  artistId: string;
}) {
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [maxSelected, setMaxSelected] = useState(8);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (
      path: string,
      method: "GET" | "POST" | "DELETE" = "GET",
      body?: Record<string, unknown>,
    ) => {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to manage Instagram.");
      const response = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(String(data.error ?? `Request failed (${response.status}).`));
      }
      return data;
    },
    [getIdToken],
  );

  const load = useCallback(async () => {
    setError(null);
    const nextStatus = (await request(
      `/api/v1/artist/instagram/connect?artistId=${encodeURIComponent(artistId)}`,
    )) as Status;
    setStatus(nextStatus);
    if (!nextStatus.connected) return;
    const result = await request(
      `/api/v1/artist/instagram/media?artistId=${encodeURIComponent(artistId)}`,
    );
    setMedia((result.media as Media[]) ?? []);
    setSelected((result.selectedIds as string[]) ?? []);
    setMaxSelected(Number(result.maxSelected ?? 8));
  }, [artistId, request]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load Instagram."),
    );
  }, [load]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await request(
        "/api/v1/artist/instagram/connect",
        "POST",
        { artistId },
      );
      if (!result.authorizeUrl) throw new Error("Instagram did not return a login link.");
      window.location.href = String(result.authorizeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect Instagram.");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await request("/api/v1/artist/instagram/connect", "DELETE", { artistId });
      setStatus((current) => ({ ...(current ?? { configured: true }), connected: false }));
      setMedia([]);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Instagram.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    setSaved(false);
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxSelected) return current;
      return [...current, id];
    });
  };

  const save = async () => {
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await request("/api/v1/artist/instagram/media", "POST", {
        artistId,
        mediaIds: selected,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your portfolio.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border hairline p-5">
      <div className="font-body text-[10px] uppercase tracking-[0.24em] text-pink">
        Instagram portfolio
      </div>
      {!status && !error && (
        <p className="mt-4 font-body text-[12px] text-white/45">Checking Instagram…</p>
      )}
      {status && !status.configured && (
        <p className="mt-4 font-body text-[12px] text-white/55">
          Instagram connection is not configured on this deployment.
        </p>
      )}
      {status?.configured && !status.connected && (
        <>
          <p className="mt-4 font-body text-[12px] leading-[1.6] text-white/55">
            Connect the Professional or Creator account matching this profile,
            then choose up to eight posts. TattTester stores the post links and
            your approval—not copied image files.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void connect()}
            className="mt-5 border hairline px-5 py-3 font-body text-[12px] text-white hover:border-pink disabled:opacity-50"
          >
            {busy ? "Opening Instagram…" : "Connect Instagram"}
          </button>
          <p className="mt-4 font-body text-[11px] leading-[1.6] text-white/35">
            Personal Instagram accounts are not available through Meta&apos;s API yet.
          </p>
        </>
      )}
      {status?.connected && (
        <>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="font-body text-[12px] text-white/60">
              Connected as @{status.connection?.username}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              className="font-body text-[11px] text-white/40 underline underline-offset-4 hover:text-white"
            >
              Disconnect
            </button>
          </div>
          <p className="mt-3 font-body text-[11px] text-white/40">
            {selected.length}/{maxSelected} selected. Tap in the order you want them shown.
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {media.map((item) => {
              const preview = item.thumbnailUrl ?? item.mediaUrl;
              const order = selected.indexOf(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  aria-pressed={order !== -1}
                  className={`relative aspect-square overflow-hidden border-2 ${
                    order !== -1 ? "border-pink" : "border-white/15"
                  }`}
                >
                  {preview ? (
                    // Temporary preview URL from the artist's live API response;
                    // it is never saved as portfolio media.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt={item.caption?.slice(0, 80) || "Instagram post"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-body text-[10px] text-white/45">
                      {item.mediaType}
                    </span>
                  )}
                  {order !== -1 && (
                    <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center bg-pink font-body text-[12px] text-black">
                      {order + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="mt-6 tape press px-7 py-3 font-display text-[18px] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Publish selected posts ▸"}
          </button>
          {saved && (
            <span className="ml-4 font-body text-[11px] uppercase tracking-[0.2em] text-pink">
              Published
            </span>
          )}
        </>
      )}
      {error && <p className="mt-4 font-body text-[12px] text-pink">{error}</p>}
    </section>
  );
}
