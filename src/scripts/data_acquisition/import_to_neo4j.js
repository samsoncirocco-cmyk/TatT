/**
 * Neo4j Importer (Phase 3: The Graph)
 * ==========================================
 * 
 * Imports verified artist data into Neo4j and generates PROOF OF CONCEPT
 * relationships to demonstrate the "Genealogy Graph" feature.
 * 
 * Usages:
 *   node src/scripts/data_acquisition/import_to_neo4j.js
 */

import fs from 'fs';
import path from 'path';
import neo4j from 'neo4j-driver';
import 'dotenv/config';

// Configuration
const CONFIG = {
    INPUT_FILE: process.env.VALIDATOR_INPUT || path.join(process.cwd(), 'src/scripts/data_acquisition/output/verified_artists_production.json'),
    NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
    NEO4J_USER: process.env.NEO4J_USER || 'neo4j',
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'password' // Check your .env
};

async function importData() {
    console.log('[Importer] Connecting to Neo4j...');

    const driver = neo4j.driver(
        CONFIG.NEO4J_URI,
        neo4j.auth.basic(CONFIG.NEO4J_USER, CONFIG.NEO4J_PASSWORD)
    );

    const session = driver.session();

    try {
        // 1. Load Data
        if (!fs.existsSync(CONFIG.INPUT_FILE)) {
            throw new Error(`Input file missing: ${CONFIG.INPUT_FILE}`);
        }
        const artists = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE, 'utf8'));
        console.log(`[Importer] Loaded ${artists.length} verified artists.`);

        // 2. Clear existing demo data (Optional: good for iteration)
        // await session.run('MATCH (n:Artist {source: "crawled_verified"}) DETACH DELETE n');

        // 3. Create Constraints (Idempotency)
        try {
            await session.run('CREATE CONSTRAINT artist_id IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE');
        } catch (e) { /* Ignore if exists */ }

        // 4. Import Nodes
        console.log('[Importer] Creating Artist Nodes...');
        for (const artist of artists) {
            await session.run(
                `
        MERGE (a:Artist {id: $id})
        SET a.name = $handle,
            a.handle = $handle,
            a.shop = $shop,
            a.city = $shop, 
            a.verified = true,
            a.quality_score = $quality_score,
            a.styles = $styles,
            a.source = 'crawled_verified'
        `,
                {
                    id: artist.id,
                    handle: artist.handle,
                    shop: artist.shop,
                    quality_score: artist.quality_score,
                    styles: artist.styles
                }
            );
        }

        // 5. Generate Mock Relationships (The "Genealogy" Demo)
        // In production, this data comes from the "Claim Profile" flow.
        // For the prototype, we create a "Legendary Node" and link some artists to it.

        console.log('[Importer] Weaving the Graph (Generating Relationships)...');

        // Create a Root Node (The "Sailor Jerry" of this graph)
        const rootId = 'legend_01';
        await session.run(`
      MERGE (a:Artist {id: $id})
      SET a.name = 'Don Ed Hardy (Node)',
          a.styles = ['American Traditional', 'Japanese'],
          a.verified = true,
          a.is_legend = true
    `, { id: rootId });

        // Link random artists as "Apprentices" to this legend
        for (const artist of artists) {
            if (artist.is_apprentice) {
                await session.run(`
          MATCH (apprentice:Artist {id: $apprId})
          MATCH (mentor:Artist {id: $mentorId})
          MERGE (apprentice)-[r:APPRENTICED_UNDER {year: 2020}]->(mentor)
        `, { apprId: artist.id, mentorId: rootId });
                console.log(`Linked ${artist.handle} -> Apprenticed Under -> Don Ed Hardy (Node)`);
            }
        }

        console.log('[Importer] Import Complete.');

    } catch (error) {
        console.error('[Importer] Error:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

importData();
