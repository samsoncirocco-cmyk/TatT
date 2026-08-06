---
status: accepted
---

# Conversation memory lives in our own Aura, beside the taste graph

Grill session, 2026-08-05. The design calls for a small per-conversation graph
on the fast path, with the ability to reach into the larger history when needed
and fold short-term memory back in when the conversation ends. Neo4j Labs ships
exactly this shape: `neo4j-agent-memory` (short-term conversation messages,
long-term extracted entities, reasoning traces), with a hosted service — NAMS —
behind it.

The TypeScript SDK documents running against the hosted service only; the Python
package can point at your own instance. Our artist graph is in our own Aura
(`neo4j+s://…databases.neo4j.io`) and already carries `:Style`, `:TAGGED_WITH`
and `SPECIALIZES_IN`. The stated payoff of putting any of this in a graph is
walking from "this customer likes blackwork" to "this artist specializes in
blackwork" — which is a single traversal only if both live in the same database.

## Decision

Conversation memory lives in **our own Aura, in the same database as the artist
and style graph**. The "small local graph" is a slice of that database scoped to
the conversation, not a separate store — the fast path is a scoped subgraph, not
a second vendor.

NAMS is not adopted for v1. It is reconsidered only if it does something
genuinely valuable for live session state that we would otherwise have to build
— not on the general principle that using both is safer.

Every memory write is idempotent and carries provenance: which turn produced it,
which agent, and with what confidence. Replaying a conversation must converge on
the same graph rather than accumulating duplicates.

## Rejected

- **Hosted NAMS with the TypeScript SDK.** Least code, native to a Next.js
  deployment, runs on Vercel Edge. Rejected because taste and artists would sit
  in different databases, so the join that motivates the whole design becomes a
  second round trip and a sync — and it puts customer conversation content in a
  third party's store for no capability we need yet.
- **Both — NAMS live, distilled into our Aura at cleanup.** Closest to the
  originally sketched architecture. Rejected as premature: it buys a sync we
  have not earned, and two vendors to keep honest, before anything has proven
  the hosted service is better at live session state than a scoped subgraph.
- **Firestore only, no graph in the loop.** Already the write path and already
  serverless-safe. Rejected because it cannot answer the recommendation
  questions that motivate this at all; the graph is the point, not the storage.

## Consequences

We write the memory layer ourselves rather than installing one. The three-layer
model (conversation / entities / reasoning) is worth copying even though the
package isn't being adopted, and the Python package remains a fallback if
hand-rolling proves worse than expected.

Firestore stays the session write path — it is serverless-safe and nothing about
this changes that. The graph is fed alongside it, which means a projection step
that can lag or fail, and therefore a graph that must never be the only place a
customer's session state exists.

Customer conversation content now lands in the same database as scraped
third-party artist data. That data already lives in production independent of
launch; conversation memory is new and is customer content, so the separation
between the two inside the graph has to be deliberate rather than incidental.
