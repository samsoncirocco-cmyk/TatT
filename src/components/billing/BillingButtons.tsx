"use client";

import { useState } from "react";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Client-side billing actions for the artist SaaS subscription (money flow #2:
 * the PLATFORM charges the ARTIST directly). Both buttons attach the firebase
 * auth header via getApiAuthHeaders and follow the Stripe-hosted URL the API
 * returns.
 */

/** Starts an artist subscription Checkout Session and redirects to Stripe. */
export function ArtistSubscribeButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  async function subscribe() {
    setError(null);
    setLoading(true);
    try {
      const headers = await getApiAuthHeaders();
      const res = await fetch("/api/v1/billing/subscribe", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: user?.uid, email: user?.email }),
      });
      const data = (await res.json()) as { sessionUrl?: string; error?: string };
      if (!res.ok || !data.sessionUrl) {
        throw new Error(data.error || "Unable to start subscription.");
      }
      window.location.href = data.sessionUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={subscribe}
        disabled={loading}
        className={className}
      >
        {loading ? "Starting…" : children}
      </button>
      {error && (
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-pink font-body">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * Opens the Stripe customer portal so an artist can manage their subscription.
 * Requires the artist's Stripe customer id (`cus_...`), which the billing
 * webhook persists after the first subscription checkout. That id is not yet
 * exposed to the client, so pass it in once it is available.
 */
export function ManageBillingButton({
  customerId,
  className,
  children,
}: {
  customerId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    if (!customerId) return;
    setError(null);
    setLoading(true);
    try {
      const headers = await getApiAuthHeaders();
      const res = await fetch("/api/v1/billing/portal", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Unable to open billing portal.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  // TODO(#80): the Stripe customer id (cus_...) is persisted by the billing
  // webhook but not yet surfaced to the client (useAuthStore has no billing
  // fields). Until it is wired through, gate the button as disabled.
  const disabled = !customerId || loading;

  return (
    <>
      <button
        type="button"
        onClick={openPortal}
        disabled={disabled}
        title={!customerId ? "Subscribe first to manage billing" : undefined}
        className={className}
      >
        {loading ? "Opening…" : children}
      </button>
      {error && (
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-pink font-body">
          {error}
        </p>
      )}
    </>
  );
}
