/**
 * SessionType persistence — Neo4j CRUD.
 *
 * :SessionType nodes linked to :Artist via (:Artist)-[:OFFERS]->(:SessionType).
 * Uses the same runWrite pattern as booking-relay.ts and artist-stripe.ts.
 *
 * Properties on the :SessionType node:
 *   id, artistId, name, slug, durationMinutes, description, depositType,
 *   depositAmount, requiresApproval, beforeBufferMinutes, afterBufferMinutes,
 *   minimumBookingNoticeHours, intakeFields (JSON string), isActive, position,
 *   cancellationPolicyHoursFullRefund, cancellationPolicyHoursPartialRefund,
 *   cancellationPolicyPartialRefundBps, createdAt, updatedAt
 *
 * OWNERSHIP CONTRACT — read this before adding a function here.
 * A :SessionType id is not a capability. Every single-node read and every
 * write takes a `SessionTypeRef { artistId, id }` and matches through the
 * owning artist:
 *
 *   MATCH (:Artist {id: $artistId})-[:OFFERS]->(st:SessionType {id: $id})
 *
 * The artistId is a required field of a required argument, so a caller
 * cannot forget it — omitting it is a compile error, not a silent
 * cross-tenant write. A miss returns "not found" without revealing whether
 * the id exists under a different artist.
 *
 * Callers are responsible for proving the artistId belongs to the signed-in
 * user before calling in. Today that binding lives on the :Artist node as
 * `claimedByUid` (set by /api/v1/connect/claim); a route must verify the
 * Firebase uid against it. This module trusts artistId and nothing else.
 */
import {
  validateSessionTypeInput,
  validateSessionTypeUpdate,
  type CreateSessionTypeInput,
  type UpdateSessionTypeInput,
} from "./session-types";

/**
 * Identifies one session type AND the artist that must own it. Passed as a
 * single object so the two ids can never be swapped positionally.
 */
export interface SessionTypeRef {
  artistId: string;
  id: string;
}

export interface SessionTypeRecord {
  id: string;
  artistId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  description: string | null;
  depositType: string;
  depositAmount: number;
  requiresApproval: boolean;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumBookingNoticeHours: number;
  intakeFields: unknown[];
  cancellationPolicyHoursFullRefund: number;
  cancellationPolicyHoursPartialRefund: number;
  cancellationPolicyPartialRefundBps: number;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

async function runRead(query: string, params: Record<string, unknown>) {
  const { executeServerCypherQuery } =
    await import("@/features/match-pulse/services/neo4jService");
  return executeServerCypherQuery(query, params);
}

async function runWrite(
  query: string,
  params: Record<string, unknown>,
): Promise<{ records: Array<unknown> }> {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } =
    await import("@/lib/neo4j");
  const neo4j = (await import("neo4j-driver")).default;
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new Error(
      "Neo4j driver not configured — cannot persist session type.",
    );
  }
  const session = driver.session(
    NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined,
  );
  try {
    const result = await session.executeWrite(
      (tx: {
        run: (
          q: string,
          p: Record<string, unknown>,
        ) => Promise<{ records: Array<unknown> }>;
      }) => tx.run(query, params),
      { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) },
    );
    return result as { records: Array<unknown> };
  } finally {
    await session.close();
  }
}

/**
 * Reject an empty scope before it reaches Cypher. An empty artistId would
 * simply match nothing, but failing here names the real bug (a caller that
 * lost the artist binding) instead of reporting a missing session type.
 */
function requireRef(ref: SessionTypeRef): void {
  if (!ref?.artistId?.trim()) {
    throw new Error("artistId is required to address a session type");
  }
  if (!ref?.id?.trim()) {
    throw new Error("id is required to address a session type");
  }
}

function rowToRecord(r: Record<string, unknown>): SessionTypeRecord {
  let intakeFields: unknown = [];
  if (r.intakeFields) {
    if (typeof r.intakeFields === "string") {
      try {
        intakeFields = JSON.parse(r.intakeFields);
      } catch {
        intakeFields = [];
      }
    } else {
      intakeFields = r.intakeFields;
    }
  }
  return {
    id: String(r.id),
    artistId: String(r.artistId),
    name: String(r.name),
    slug: String(r.slug),
    durationMinutes: Number(r.durationMinutes),
    description: (r.description as string) ?? null,
    depositType: String(r.depositType ?? "none"),
    depositAmount: Number(r.depositAmount ?? 0),
    requiresApproval: Boolean(r.requiresApproval),
    beforeBufferMinutes: Number(r.beforeBufferMinutes ?? 30),
    afterBufferMinutes: Number(r.afterBufferMinutes ?? 30),
    minimumBookingNoticeHours: Number(r.minimumBookingNoticeHours ?? 24),
    intakeFields: Array.isArray(intakeFields) ? intakeFields : [],
    cancellationPolicyHoursFullRefund: Number(
      r.cancellationPolicyHoursFullRefund ?? 72,
    ),
    cancellationPolicyHoursPartialRefund: Number(
      r.cancellationPolicyHoursPartialRefund ?? 48,
    ),
    cancellationPolicyPartialRefundBps: Number(
      r.cancellationPolicyPartialRefundBps ?? 5000,
    ),
    isActive: r.isActive !== false,
    position: Number(r.position ?? 0),
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

/** Create a session type and link it to the artist. Idempotent by id (MERGE). */
export async function createSessionType(
  input: CreateSessionTypeInput & { id: string },
): Promise<void> {
  const validated = validateSessionTypeInput(input);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const value = validated.value;
  const now = new Date().toISOString();
  const intakeFieldsJson = JSON.stringify(value.intakeFields ?? []);
  const result = await runWrite(
    `MATCH (a:Artist {id: $artistId})
     MERGE (st:SessionType {id: $id})
     ON CREATE SET
       st.artistId = $artistId,
       st.name = $name,
       st.slug = $slug,
       st.durationMinutes = $durationMinutes,
       st.description = $description,
       st.depositType = $depositType,
       st.depositAmount = $depositAmount,
       st.requiresApproval = $requiresApproval,
       st.beforeBufferMinutes = $beforeBufferMinutes,
       st.afterBufferMinutes = $afterBufferMinutes,
       st.minimumBookingNoticeHours = $minimumBookingNoticeHours,
       st.intakeFields = $intakeFields,
       st.isActive = true,
       st.position = $position,
       st.cancellationPolicyHoursFullRefund = $fullRefundHours,
       st.cancellationPolicyHoursPartialRefund = $partialRefundHours,
       st.cancellationPolicyPartialRefundBps = $partialRefundBps,
       st.createdAt = $createdAt,
       st.updatedAt = $updatedAt
     WITH a, st, st.artistId = $artistId AS ownedByCaller
     FOREACH (_ IN CASE WHEN ownedByCaller THEN [1] ELSE [] END |
       MERGE (a)-[:OFFERS]->(st)
     )
     RETURN st.id AS id, ownedByCaller AS ownedByCaller`,
    {
      id: input.id,
      artistId: value.artistId,
      name: value.name,
      slug: value.slug,
      durationMinutes: value.durationMinutes,
      description: value.description ?? null,
      depositType: value.depositType ?? "none",
      depositAmount: value.depositAmount ?? 0,
      requiresApproval: value.requiresApproval ?? false,
      beforeBufferMinutes: value.beforeBufferMinutes ?? 30,
      afterBufferMinutes: value.afterBufferMinutes ?? 30,
      minimumBookingNoticeHours: value.minimumBookingNoticeHours ?? 24,
      intakeFields: intakeFieldsJson,
      position: 0,
      fullRefundHours: value.cancellationPolicyHoursFullRefund ?? 72,
      partialRefundHours: value.cancellationPolicyHoursPartialRefund ?? 48,
      partialRefundBps: value.cancellationPolicyPartialRefundBps ?? 5000,
      createdAt: now,
      updatedAt: now,
    },
  );
  if (!result.records.length) {
    throw new Error(
      `Artist not found — cannot create session type (artistId=${input.artistId}).`,
    );
  }
  const row = result.records[0] as {
    get?: (key: string) => unknown;
    ownedByCaller?: unknown;
  };
  const ownedByCaller =
    typeof row.get === "function"
      ? Boolean(row.get("ownedByCaller"))
      : Boolean(row.ownedByCaller);
  if (!ownedByCaller) {
    throw new Error(
      `Session type id already owned by another artist (id=${input.id}).`,
    );
  }
}

/** Get all active session types for an artist. */
export async function getSessionTypesByArtist(
  artistId: string,
): Promise<SessionTypeRecord[]> {
  const rows = await runRead(
    `MATCH (:Artist {id: $artistId})-[:OFFERS]->(st:SessionType)
     WHERE st.isActive = true
     RETURN st
     ORDER BY st.position ASC, st.name ASC`,
    { artistId },
  );
  return rows.map((r) => {
    const node = (r as Record<string, Record<string, unknown>>).st;
    return rowToRecord(node ?? (r as Record<string, unknown>));
  });
}

/**
 * Get one session type, scoped to its owning artist. Returns null when the
 * artist does not own a session type with that id — deliberately
 * indistinguishable from "no such id".
 */
export async function getSessionType(
  ref: SessionTypeRef,
): Promise<SessionTypeRecord | null> {
  requireRef(ref);
  const rows = await runRead(
    `MATCH (:Artist {id: $artistId})-[:OFFERS]->(st:SessionType {id: $id})
     RETURN st`,
    { artistId: ref.artistId, id: ref.id },
  );
  if (!rows.length) return null;
  const node = (rows[0] as Record<string, Record<string, unknown>>).st;
  return rowToRecord(node ?? (rows[0] as Record<string, unknown>));
}

/**
 * Update a session type owned by `ref.artistId`. Only the fields present in
 * `updates` are SET. Patches face exactly the rules create does — the shared
 * validator in ./session-types is the single source of truth.
 */
export async function updateSessionType(
  ref: SessionTypeRef,
  updates: UpdateSessionTypeInput,
): Promise<void> {
  requireRef(ref);
  const validated = validateSessionTypeUpdate(updates);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  // artistId is not patchable: reassigning a session type to another artist
  // is not an update, and allowing it here would reopen the hole this
  // function's scoping closes.
  if (updates.artistId !== undefined && updates.artistId !== ref.artistId) {
    throw new Error("artistId cannot be changed via updateSessionType");
  }

  const setClauses: string[] = ["st.updatedAt = $updatedAt"];
  const params: Record<string, unknown> = {
    artistId: ref.artistId,
    id: ref.id,
    updatedAt: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    setClauses.push("st.name = $name");
    params.name = updates.name;
  }
  if (updates.slug !== undefined) {
    setClauses.push("st.slug = $slug");
    params.slug = updates.slug;
  }
  if (updates.durationMinutes !== undefined) {
    setClauses.push("st.durationMinutes = $durationMinutes");
    params.durationMinutes = updates.durationMinutes;
  }
  if (updates.description !== undefined) {
    setClauses.push("st.description = $description");
    params.description = updates.description ?? null;
  }
  if (updates.depositType !== undefined) {
    setClauses.push("st.depositType = $depositType");
    params.depositType = updates.depositType;
  }
  if (updates.depositAmount !== undefined) {
    setClauses.push("st.depositAmount = $depositAmount");
    params.depositAmount = updates.depositAmount;
  }
  if (updates.requiresApproval !== undefined) {
    setClauses.push("st.requiresApproval = $requiresApproval");
    params.requiresApproval = updates.requiresApproval;
  }
  if (updates.beforeBufferMinutes !== undefined) {
    setClauses.push("st.beforeBufferMinutes = $beforeBufferMinutes");
    params.beforeBufferMinutes = updates.beforeBufferMinutes;
  }
  if (updates.afterBufferMinutes !== undefined) {
    setClauses.push("st.afterBufferMinutes = $afterBufferMinutes");
    params.afterBufferMinutes = updates.afterBufferMinutes;
  }
  if (updates.minimumBookingNoticeHours !== undefined) {
    setClauses.push(
      "st.minimumBookingNoticeHours = $minimumBookingNoticeHours",
    );
    params.minimumBookingNoticeHours = updates.minimumBookingNoticeHours;
  }
  if (updates.intakeFields !== undefined) {
    setClauses.push("st.intakeFields = $intakeFields");
    params.intakeFields = JSON.stringify(updates.intakeFields);
  }
  if (updates.isActive !== undefined) {
    setClauses.push("st.isActive = $isActive");
    params.isActive = updates.isActive;
  }
  if (updates.cancellationPolicyHoursFullRefund !== undefined) {
    setClauses.push("st.cancellationPolicyHoursFullRefund = $fullRefundHours");
    params.fullRefundHours = updates.cancellationPolicyHoursFullRefund;
  }
  if (updates.cancellationPolicyHoursPartialRefund !== undefined) {
    setClauses.push(
      "st.cancellationPolicyHoursPartialRefund = $partialRefundHours",
    );
    params.partialRefundHours = updates.cancellationPolicyHoursPartialRefund;
  }
  if (updates.cancellationPolicyPartialRefundBps !== undefined) {
    setClauses.push(
      "st.cancellationPolicyPartialRefundBps = $partialRefundBps",
    );
    params.partialRefundBps = updates.cancellationPolicyPartialRefundBps;
  }

  const result = await runWrite(
    `MATCH (:Artist {id: $artistId})-[:OFFERS]->(st:SessionType {id: $id})
     SET ${setClauses.join(", ")}
     RETURN st.id AS id`,
    params,
  );
  if (!result.records.length) {
    // Same message whether the id is unknown or owned by someone else — do
    // not turn this into an oracle for other artists' session-type ids.
    throw new Error(
      `Session type not found for this artist — cannot update (id=${ref.id}).`,
    );
  }
}

/** Soft-delete: set isActive = false. Scoped through the owning artist. */
export async function deactivateSessionType(ref: SessionTypeRef): Promise<void> {
  await updateSessionType(ref, { isActive: false });
}
