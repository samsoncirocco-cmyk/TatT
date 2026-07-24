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
 */
import type { SessionType, CreateSessionTypeInput } from './session-types';

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
  const { executeServerCypherQuery } = await import('@/features/match-pulse/services/neo4jService');
  return executeServerCypherQuery(query, params);
}

async function runWrite(
  query: string,
  params: Record<string, unknown>
): Promise<{ records: Array<unknown> }> {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import('@/lib/neo4j');
  const neo4j = (await import('neo4j-driver')).default;
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new Error('Neo4j driver not configured — cannot persist session type.');
  }
  const session = driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);
  try {
    const result = await session.executeWrite(
      (tx: { run: (q: string, p: Record<string, unknown>) => Promise<{ records: Array<unknown> }> }) =>
        tx.run(query, params),
      { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) }
    );
    return result as { records: Array<unknown> };
  } finally {
    await session.close();
  }
}

function rowToRecord(r: Record<string, unknown>): SessionTypeRecord {
  let intakeFields: unknown = [];
  if (r.intakeFields) {
    if (typeof r.intakeFields === 'string') {
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
    depositType: String(r.depositType ?? 'none'),
    depositAmount: Number(r.depositAmount ?? 0),
    requiresApproval: Boolean(r.requiresApproval),
    beforeBufferMinutes: Number(r.beforeBufferMinutes ?? 30),
    afterBufferMinutes: Number(r.afterBufferMinutes ?? 30),
    minimumBookingNoticeHours: Number(r.minimumBookingNoticeHours ?? 24),
    intakeFields: Array.isArray(intakeFields) ? intakeFields : [],
    cancellationPolicyHoursFullRefund: Number(r.cancellationPolicyHoursFullRefund ?? 72),
    cancellationPolicyHoursPartialRefund: Number(r.cancellationPolicyHoursPartialRefund ?? 48),
    cancellationPolicyPartialRefundBps: Number(r.cancellationPolicyPartialRefundBps ?? 5000),
    isActive: r.isActive !== false,
    position: Number(r.position ?? 0),
    createdAt: String(r.createdAt ?? ''),
    updatedAt: String(r.updatedAt ?? ''),
  };
}

/** Create a session type and link it to the artist. */
export async function createSessionType(input: CreateSessionTypeInput & { id: string }): Promise<void> {
  const now = new Date().toISOString();
  const intakeFieldsJson = JSON.stringify(input.intakeFields ?? []);
  const result = await runWrite(
    `MATCH (a:Artist {id: $artistId})
     CREATE (st:SessionType {
       id: $id,
       artistId: $artistId,
       name: $name,
       slug: $slug,
       durationMinutes: $durationMinutes,
       description: $description,
       depositType: $depositType,
       depositAmount: $depositAmount,
       requiresApproval: $requiresApproval,
       beforeBufferMinutes: $beforeBufferMinutes,
       afterBufferMinutes: $afterBufferMinutes,
       minimumBookingNoticeHours: $minimumBookingNoticeHours,
       intakeFields: $intakeFields,
       isActive: true,
       position: $position,
       cancellationPolicyHoursFullRefund: $fullRefundHours,
       cancellationPolicyHoursPartialRefund: $partialRefundHours,
       cancellationPolicyPartialRefundBps: $partialRefundBps,
       createdAt: $createdAt,
       updatedAt: $updatedAt
     })
     CREATE (a)-[:OFFERS]->(st)
     RETURN st.id AS id`,
    {
      id: input.id,
      artistId: input.artistId,
      name: input.name,
      slug: input.slug,
      durationMinutes: input.durationMinutes,
      description: input.description ?? null,
      depositType: input.depositType ?? 'none',
      depositAmount: input.depositAmount ?? 0,
      requiresApproval: input.requiresApproval ?? false,
      beforeBufferMinutes: input.beforeBufferMinutes ?? 30,
      afterBufferMinutes: input.afterBufferMinutes ?? 30,
      minimumBookingNoticeHours: input.minimumBookingNoticeHours ?? 24,
      intakeFields: intakeFieldsJson,
      position: 0,
      fullRefundHours: input.cancellationPolicyHoursFullRefund ?? 72,
      partialRefundHours: input.cancellationPolicyHoursPartialRefund ?? 48,
      partialRefundBps: input.cancellationPolicyPartialRefundBps ?? 5000,
      createdAt: now,
      updatedAt: now,
    }
  );
  if (!result.records.length) {
    throw new Error(`Artist not found — cannot create session type (artistId=${input.artistId}).`);
  }
}

/** Get all active session types for an artist. */
export async function getSessionTypesByArtist(artistId: string): Promise<SessionTypeRecord[]> {
  const rows = await runRead(
    `MATCH (:Artist {id: $artistId})-[:OFFERS]->(st:SessionType)
     WHERE st.isActive = true
     RETURN st
     ORDER BY st.position ASC, st.name ASC`,
    { artistId }
  );
  return rows.map((r) => {
    const node = (r as Record<string, Record<string, unknown>>).st;
    return rowToRecord(node ?? (r as Record<string, unknown>));
  });
}

/** Get a specific session type by id. */
export async function getSessionType(id: string): Promise<SessionTypeRecord | null> {
  const rows = await runRead(
    `MATCH (st:SessionType {id: $id})
     RETURN st`,
    { id }
  );
  if (!rows.length) return null;
  const node = (rows[0] as Record<string, Record<string, unknown>>).st;
  return rowToRecord(node ?? (rows[0] as Record<string, unknown>));
}

/** Update a session type. Only non-null fields are SET. */
export async function updateSessionType(
  id: string,
  updates: Partial<CreateSessionTypeInput> & { isActive?: boolean }
): Promise<void> {
  const setClauses: string[] = ['st.updatedAt = $updatedAt'];
  const params: Record<string, unknown> = { id, updatedAt: new Date().toISOString() };

  if (updates.name !== undefined) { setClauses.push('st.name = $name'); params.name = updates.name; }
  if (updates.slug !== undefined) { setClauses.push('st.slug = $slug'); params.slug = updates.slug; }
  if (updates.durationMinutes !== undefined) { setClauses.push('st.durationMinutes = $durationMinutes'); params.durationMinutes = updates.durationMinutes; }
  if (updates.description !== undefined) { setClauses.push('st.description = $description'); params.description = updates.description ?? null; }
  if (updates.depositType !== undefined) { setClauses.push('st.depositType = $depositType'); params.depositType = updates.depositType; }
  if (updates.depositAmount !== undefined) { setClauses.push('st.depositAmount = $depositAmount'); params.depositAmount = updates.depositAmount; }
  if (updates.requiresApproval !== undefined) { setClauses.push('st.requiresApproval = $requiresApproval'); params.requiresApproval = updates.requiresApproval; }
  if (updates.beforeBufferMinutes !== undefined) { setClauses.push('st.beforeBufferMinutes = $beforeBufferMinutes'); params.beforeBufferMinutes = updates.beforeBufferMinutes; }
  if (updates.afterBufferMinutes !== undefined) { setClauses.push('st.afterBufferMinutes = $afterBufferMinutes'); params.afterBufferMinutes = updates.afterBufferMinutes; }
  if (updates.minimumBookingNoticeHours !== undefined) { setClauses.push('st.minimumBookingNoticeHours = $minimumBookingNoticeHours'); params.minimumBookingNoticeHours = updates.minimumBookingNoticeHours; }
  if (updates.intakeFields !== undefined) { setClauses.push('st.intakeFields = $intakeFields'); params.intakeFields = JSON.stringify(updates.intakeFields); }
  if (updates.isActive !== undefined) { setClauses.push('st.isActive = $isActive'); params.isActive = updates.isActive; }
  if (updates.cancellationPolicyHoursFullRefund !== undefined) { setClauses.push('st.cancellationPolicyHoursFullRefund = $fullRefundHours'); params.fullRefundHours = updates.cancellationPolicyHoursFullRefund; }
  if (updates.cancellationPolicyHoursPartialRefund !== undefined) { setClauses.push('st.cancellationPolicyHoursPartialRefund = $partialRefundHours'); params.partialRefundHours = updates.cancellationPolicyHoursPartialRefund; }
  if (updates.cancellationPolicyPartialRefundBps !== undefined) { setClauses.push('st.cancellationPolicyPartialRefundBps = $partialRefundBps'); params.partialRefundBps = updates.cancellationPolicyPartialRefundBps; }

  const result = await runWrite(
    `MATCH (st:SessionType {id: $id})
     SET ${setClauses.join(', ')}
     RETURN st.id AS id`,
    params
  );
  if (!result.records.length) {
    throw new Error(`Session type not found — cannot update (id=${id}).`);
  }
}

/** Soft-delete: set isActive = false. */
export async function deactivateSessionType(id: string): Promise<void> {
  await updateSessionType(id, { isActive: false });
}
