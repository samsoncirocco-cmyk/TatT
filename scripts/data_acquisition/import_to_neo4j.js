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
import {
    filterTombstoned,
    loadTombstoneGate,
    neo4jTombstoneReader,
} from '../lib/takedown-tombstone.mjs';

// Configuration
const CONFIG = {
    INPUT_FILE: process.env.VALIDATOR_INPUT || path.join(process.cwd(), 'src/scripts/data_acquisition/output/verified_artists_production.json'),
    NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
    NEO4J_USER: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j',
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'password', // Check your .env
    NEO4J_DATABASE: process.env.NEO4J_DATABASE || undefined
};

async function importData() {
    console.log('[Importer] Connecting to Neo4j...');

    const driver = neo4j.driver(
        CONFIG.NEO4J_URI,
        neo4j.auth.basic(CONFIG.NEO4J_USER, CONFIG.NEO4J_PASSWORD)
    );

    const session = driver.session(CONFIG.NEO4J_DATABASE ? { database: CONFIG.NEO4J_DATABASE } : undefined);

    try {
        // 1. Load Data
        if (!fs.existsSync(CONFIG.INPUT_FILE)) {
            throw new Error(`Input file missing: ${CONFIG.INPUT_FILE}`);
        }
        const allArtists = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE, 'utf8'));
        console.log(`[Importer] Loaded ${allArtists.length} verified artists.`);

        // 1b. Takedown gate — the last thing standing between a re-scrape and
        // an artist who asked to be removed. loadTombstoneGate THROWS if the
        // list cannot be read; that abort is deliberate (docs/adr/0024 §4).
        // A takedown a scrape undoes is not a takedown.
        const gate = await loadTombstoneGate(neo4jTombstoneReader(session));
        const { allowed: artists, blocked } = filterTombstoned(gate, allArtists);
        console.log(`[Importer] Takedown gate: ${gate.keyCount} tombstone key(s) loaded.`);
        if (blocked.length) {
            console.log(`[Importer] SKIPPING ${blocked.length} tombstoned artist(s):`);
            for (const b of blocked) {
                console.log(`    ⛔ ${b.record.handle || b.record.id} — matched ${b.matchedKey}`);
            }
        }

        // 2. Clear existing demo data (Optional: good for iteration)
        // await session.run('MATCH (n:Artist {source: "crawled_verified"}) DETACH DELETE n');

        // 3. Create Constraints (Idempotency)
        try {
            await session.run('CREATE CONSTRAINT artist_id IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE');
        } catch (e) { /* Ignore if exists */ }

        // 4. Import Nodes (Artists & Shops) using the canonical graph model:
        //    (City)-[:HAS_SHOP]->(Shop)-[:HAS_ARTIST]->(Artist)
        //    (Artist)-[:SPECIALIZES_IN]->(Style)
        //    (Shop)-[:HAS_WEBSITE]->(Website)  -- only when a URL exists
        //    Note: this source has no state field, so no State node is created.
        console.log('[Importer] Creating Artist & Shop Nodes...');
        for (const artist of artists) {
            // Prepare shop params
            const shopData = artist.shop_details || {
                name: artist.shop || 'Unknown Shop',
                city: artist.city || 'Unknown City',
                address: null,
                website: null,
                place_id: null,
                rating: null
            };

            const shopWebsite = (typeof shopData.website === 'string' && shopData.website.trim().length > 0)
                ? shopData.website.trim()
                : null;

            await session.run(
                `
                // 1. City -> Shop
                MERGE (c:City {name: $shopCity})
                MERGE (s:Shop {name: $shopName, city: $shopCity})
                ON CREATE SET
                    s.address = $shopAddress,
                    s.rating = $shopRating,
                    s.created_at = datetime()
                ON MATCH SET
                    s.rating = $shopRating // Update rating if changed
                MERGE (c)-[:HAS_SHOP]->(s)

                // 2. Merge Artist
                MERGE (a:Artist {id: $artistId})
                SET a.name = $handle,
                    a.handle = $handle,
                    a.verified = true,
                    a.quality_score = $quality_score,
                    a.source = 'crawled_verified'

                // 3. Shop -> Artist
                MERGE (s)-[:HAS_ARTIST]->(a)

                // 4. Styles: (Artist)-[:SPECIALIZES_IN]->(Style), (Shop)-[:FEATURES_STYLE]->(Style)
                FOREACH (styleName IN $styles |
                    MERGE (st:Style {name: styleName})
                    MERGE (a)-[:SPECIALIZES_IN]->(st)
                    MERGE (s)-[:FEATURES_STYLE]->(st)
                )

                // 5. Website (only when a real URL exists)
                FOREACH (_ IN CASE WHEN $shopWebsite IS NULL THEN [] ELSE [1] END |
                    MERGE (w:Website {url: $shopWebsite})
                    MERGE (s)-[:HAS_WEBSITE]->(w)
                )
                `,
                {
                    artistId: artist.id,
                    handle: artist.handle,
                    quality_score: artist.quality_score,
                    styles: artist.styles || [],

                    shopName: shopData.name,
                    shopCity: shopData.city,
                    shopAddress: shopData.address,
                    shopWebsite: shopWebsite,
                    shopRating: shopData.rating
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
          a.verified = true,
          a.is_legend = true
      FOREACH (styleName IN $styles |
        MERGE (st:Style {name: styleName})
        MERGE (a)-[:SPECIALIZES_IN]->(st)
      )
    `, { id: rootId, styles: ['American Traditional', 'Japanese'] });

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
