import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j';
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
            const result = await session.run(query, params);
            const records = result.records.map((record: any) => record.toObject());
            return NextResponse.json({ records });
        } finally {
            await session.close();
        }
    } catch (error: any) {
        console.error('[Neo4j] Query error:', error);
        return NextResponse.json({ error: 'Neo4j query failed', details: error.message }, { status: 500 });
    }
}
