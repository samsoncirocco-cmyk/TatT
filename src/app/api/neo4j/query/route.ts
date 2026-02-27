import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { getNeo4jDriver, NEO4J_QUERY_TIMEOUT } from '@/lib/neo4j';
import { verifyApiAuth } from '@/lib/api-auth';
// Neo4j driver uses TCP, not edge compatible usually unless using a specific edge driver or HTTP API.
// Assuming Node.js runtime for Neo4j for now to be safe.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    // Rate limit check could go here

    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const driver = getNeo4jDriver();
    if (!driver) {
        return NextResponse.json({ error: 'Neo4j driver not initialized' }, { status: 500 });
    }

    try {
        const { query, params } = await req.json();
        const session = driver.session();

        try {
            const result = await session.executeRead(
                (tx: any) => tx.run(query, params),
                { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) }
            );
            const records = result.records.map((record: any) => record.toObject());
            return NextResponse.json({ records });
        } finally {
            await session.close();
        }
    } catch (error: any) {
        const errorCode = typeof error?.code === 'string' ? error.code : '';
        const errorMessage = String(error?.message || '');
        const isTimeout = errorCode.includes('Transaction') || errorCode.includes('SessionExpired') || /timed?\s*out|timeout/i.test(errorMessage);
        if (isTimeout) {
            console.error('[Neo4j] Query timeout:', error);
            return NextResponse.json({ error: 'Query timeout' }, { status: 504 });
        }

        console.error('[Neo4j] Query error:', error);
        return NextResponse.json({ error: 'Neo4j query failed', details: error.message }, { status: 500 });
    }
}
