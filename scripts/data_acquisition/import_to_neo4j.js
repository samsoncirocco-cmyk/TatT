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

// Configuration — no insecure defaults. Fail loud if env is missing.
// (Pre-port: NEO4J_PASSWORD fell back to literal 'password' which silently
// connected to misconfigured envs and only failed at the network layer.)
function requireEnv(name) {
    const v = process.env[name];
    if (!v || v.trim() === '') {
        throw new Error(
            `Missing required env var: ${name}. ` +
            `Set it in .env.local before running import_to_neo4j.js.`
        );
    }
    return v;
}

const CONFIG = {
    INPUT_FILE: process.env.VALIDATOR_INPUT || path.join(process.cwd(), 'scripts/data_acquisition/output/verified_artists.json'),
    NEO4J_URI: requireEnv('NEO4J_URI'),
    NEO4J_USER: requireEnv('NEO4J_USER'),
    NEO4J_PASSWORD: requireEnv('NEO4J_PASSWORD'),
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
        // Pre-port: this catch swallowed ALL errors including auth/network failures.
        // We only want to ignore the specific "already exists" case, not real problems.
        try {
            await session.run('CREATE CONSTRAINT artist_id IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE');
        } catch (e) {
            const msg = (e && e.message) || String(e);
            if (msg.includes('already exists') || msg.includes('EquivalentSchemaRuleAlreadyExistsException')) {
                // Expected on subsequent runs — constraint already in place.
            } else {
                throw new Error(`Failed to create artist_id constraint: ${msg}`);
            }
        }

        // 4. Import Nodes (Artists & Shops)
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

            // Use place_id as unique ID for shop if available, otherwise hash name+city
            const shopId = shopData.place_id || `shop_${shopData.name}_${shopData.city}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

            await session.run(
                `
                // 1. Merge Shop
                MERGE (s:Shop {id: $shopId})
                ON CREATE SET 
                    s.name = $shopName,
                    s.city = $shopCity,
                    s.address = $shopAddress,
                    s.website = $shopWebsite,
                    s.rating = $shopRating,
                    s.created_at = datetime()
                ON MATCH SET
                    s.rating = $shopRating // Update rating if changed

                // 2. Merge Artist
                MERGE (a:Artist {id: $artistId})
                SET a.name = $handle,
                    a.handle = $handle,
                    a.verified = true,
                    a.quality_score = $quality_score,
                    a.styles = $styles,
                    a.source = 'crawled_verified'
                
                // 3. Create Relationship
                MERGE (a)-[:WORKS_AT]->(s)
                `,
                {
                    artistId: artist.id,
                    handle: artist.handle,
                    quality_score: artist.quality_score,
                    styles: artist.styles,

                    shopId: shopId,
                    shopName: shopData.name,
                    shopCity: shopData.city,
                    shopAddress: shopData.address,
                    shopWebsite: shopData.website,
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
