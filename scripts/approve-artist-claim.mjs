/**
 * Approve a pending artist ownership claim. DRY RUN BY DEFAULT.
 *
 * Instagram proof:
 *   node scripts/approve-artist-claim.mjs --request-id CL-1234ABCD
 *   node scripts/approve-artist-claim.mjs --request-id CL-1234ABCD \
 *     --method instagram --approved-by samson --handle-verified \
 *     --execute --confirm CL-1234ABCD
 *
 * No-Instagram fallback:
 *   node scripts/approve-artist-claim.mjs --request-id CL-1234ABCD \
 *     --approved-by samson \
 *     --method manual --review-note "Video call and studio ID checked by Samson" \
 *     --execute --confirm CL-1234ABCD
 */
import neo4j from 'neo4j-driver';
import { config } from 'dotenv';
import {
  APPROVE_CLAIM_CYPHER,
  executeClaimApproval,
  planClaimApproval,
} from './lib/claim-approval-plan.mjs';

config();
config({ path: '.env.local', override: false });

function parseArgs(argv) {
  const options = {
    requestId: null,
    method: 'instagram',
    approvedBy: null,
    handleVerified: false,
    reviewNote: null,
    execute: false,
    confirm: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const next = () => argv[++index];
    if (argv[index] === '--request-id') options.requestId = next();
    else if (argv[index] === '--method') options.method = next();
    else if (argv[index] === '--approved-by') options.approvedBy = next();
    else if (argv[index] === '--handle-verified') options.handleVerified = true;
    else if (argv[index] === '--review-note') options.reviewNote = next();
    else if (argv[index] === '--execute') options.execute = true;
    else if (argv[index] === '--confirm') options.confirm = next();
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (!options.requestId) {
  console.error('Missing --request-id.');
  process.exit(2);
}

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || process.env.NEO4J_USER,
    process.env.NEO4J_PASSWORD,
  ),
);
const session = driver.session(
  process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : undefined,
);
const number = (value) =>
  value == null ? null : Number(typeof value?.toNumber === 'function' ? value.toNumber() : value);

try {
  const requestResult = await session.run(
    `MATCH (r:ArtistClaimRequest {id: $requestId, status: 'pending_verification'})
     RETURN r.id AS id, r.artistId AS artistId, r.uid AS uid,
            r.contactEmail AS contactEmail, r.instagram AS instagram,
            r.verificationCode AS verificationCode, r.issuedAtEpochMs AS issuedAtEpochMs`,
    { requestId: options.requestId },
  );
  const request = requestResult.records[0]
    ? {
        id: requestResult.records[0].get('id'),
        artistId: requestResult.records[0].get('artistId'),
        uid: requestResult.records[0].get('uid'),
        contactEmail: requestResult.records[0].get('contactEmail'),
        instagram: requestResult.records[0].get('instagram'),
        verificationCode: requestResult.records[0].get('verificationCode'),
        issuedAtEpochMs: number(requestResult.records[0].get('issuedAtEpochMs')),
      }
    : null;
  const artistResult = request
    ? await session.run(
        `MATCH (a:Artist {id: $artistId})
         RETURN a.id AS id, a.instagram AS instagram, a.removedAt AS removedAt,
                a.claimedByUid AS claimedByUid,
                a.claimVerificationStatus AS claimVerificationStatus`,
        { artistId: request.artistId },
      )
    : { records: [] };
  const artist = artistResult.records[0]
    ? {
        id: artistResult.records[0].get('id'),
        instagram: artistResult.records[0].get('instagram'),
        removedAt: number(artistResult.records[0].get('removedAt')),
        claimedByUid: artistResult.records[0].get('claimedByUid'),
        claimVerificationStatus: artistResult.records[0].get('claimVerificationStatus'),
      }
    : null;

  const plan = planClaimApproval(
    { request, artist },
    {
      requestId: options.requestId,
      method: options.method,
      approvedBy: options.approvedBy,
      handleVerified: options.handleVerified,
      reviewNote: options.reviewNote,
    },
  );
  console.log(JSON.stringify({
    requestId: plan.requestId,
    artistId: artist?.id ?? null,
    instagram: artist?.instagram ?? null,
    verificationCode: request?.verificationCode ?? null,
    method: plan.method,
    approvedBy: plan.approvedBy,
    blockers: plan.blockers,
    warnings: plan.warnings,
    dryRun: !options.execute,
  }, null, 2));

  const deps = {
    async approveAtomically(fields) {
      const result = await session.executeWrite((tx) =>
        tx.run(APPROVE_CLAIM_CYPHER, fields),
      );
      return result.records.length === 1;
    },
  };
  const result = await executeClaimApproval(deps, plan, {
    execute: options.execute,
    confirm: options.confirm,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} finally {
  await session.close();
  await driver.close();
}
