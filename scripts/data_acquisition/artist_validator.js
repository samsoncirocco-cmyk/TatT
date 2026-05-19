/**
 * Artist Validator — verifies scraped artists by analyzing their portfolio.
 *
 * PORTED FROM: Vite TatT → Next.js manama-next, 2026-05-19
 *
 * AUDIT FIXES APPLIED:
 *   1. Removed Math.random() "simulated AI verification" — it was producing
 *      random pass/fail and random style labels on real production data.
 *      Replaced with an explicit "not implemented" hard-fail so nothing
 *      silently mislabels artists ever again.
 *   2. Removed Math.random()-based artist IDs. IDs are now a stable hash of
 *      the artist handle so re-running the validator does NOT create
 *      duplicate Neo4j nodes for the same human artist.
 *   3. Atomic file writes (tmp + rename) so a crash mid-write can't corrupt
 *      the verified-artists file.
 *
 * REPLACE simulateAiAnalysis() with a real Vertex AI / Gemini Vision call
 * before running against production data. The stub below throws on purpose.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
    INPUT_FILE: path.join(__dirname, 'output', 'raw_artists.json'),
    OUTPUT_FILE: path.join(__dirname, 'output', 'verified_artists.json'),
    REQUIRE_REAL_AI: process.env.REQUIRE_REAL_AI !== 'false', // default ON
};

/**
 * Stable, deterministic artist ID from handle.
 * Same handle → same ID, every time. Safe for Neo4j MERGE.
 */
function artistIdFromHandle(handle) {
    if (!handle || typeof handle !== 'string') {
        throw new Error(`artistIdFromHandle: invalid handle: ${JSON.stringify(handle)}`);
    }
    const normalized = handle.trim().toLowerCase().replace(/^@/, '');
    const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 12);
    return `artist_${hash}`;
}

/**
 * REAL AI ANALYSIS — must be implemented before production use.
 *
 * Replace this stub with a Vertex AI / Gemini Vision call that:
 *   1. Fetches the 9 latest images from the social profile.
 *   2. Asks Vision: "Are these tattoos? What style? Quality 0-100?"
 *   3. Returns { verified, styles, quality_score, mentions_apprentice }.
 *
 * Until then, this function HARD-FAILS by design. The old version used
 * Math.random() to fake it, which silently mislabeled production data.
 */
async function analyzeArtistPortfolio(artistHandle) {
    if (CONFIG.REQUIRE_REAL_AI) {
        throw new Error(
            `analyzeArtistPortfolio: NOT IMPLEMENTED. ` +
            `The old Math.random() fake was removed during the manama-next port. ` +
            `Implement Vertex AI / Gemini Vision here before running this validator. ` +
            `Set REQUIRE_REAL_AI=false to skip validation entirely (artists pass through unverified).`
        );
    }

    // Bypass mode: pass everyone through, but mark them clearly unverified.
    return {
        verified: false,
        unverified_reason: 'validator_bypassed_REQUIRE_REAL_AI=false',
        styles: [],
        quality_score: null,
        mentions_apprentice: null,
    };
}

/**
 * Atomic JSON write — write to .tmp, then rename. Safe across crashes.
 */
function writeJsonAtomic(filePath, data) {
    const tmpPath = `${filePath}.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filePath);
}

async function runValidator() {
    console.log('[Validator] Starting artist verification (real AI required).');
    console.log(`[Validator] Input:  ${CONFIG.INPUT_FILE}`);
    console.log(`[Validator] Output: ${CONFIG.OUTPUT_FILE}`);

    if (!fs.existsSync(CONFIG.INPUT_FILE)) {
        throw new Error(`Input file not found: ${CONFIG.INPUT_FILE}. Run the crawler first.`);
    }

    const rawData = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE, 'utf8'));
    const allArtists = [];

    rawData.forEach(shop => {
        if (shop.found_artists && shop.found_artists.length > 0) {
            shop.found_artists.forEach(artist => {
                allArtists.push({
                    ...artist,
                    shop_name: shop.name,
                    shop_city: shop.address,
                });
            });
        }
    });

    console.log(`[Validator] Loaded ${allArtists.length} potential artists.`);

    const verifiedArtists = [];
    let rejected = 0;
    let failed = 0;

    for (const artist of allArtists) {
        process.stdout.write(`Analyzing @${artist.handle}... `);

        let analysis;
        try {
            analysis = await analyzeArtistPortfolio(artist.handle);
        } catch (err) {
            // Hard-fail: stop the whole run, don't silently continue.
            // (Old code caught everything and wrote partial garbage to disk.)
            console.error(`\n[Validator] FATAL: ${err.message}`);
            console.error('[Validator] Stopping. No output written.');
            process.exit(2);
        }

        if (analysis.verified) {
            console.log(`✅ VERIFIED [${analysis.styles.join(', ')}]`);
            verifiedArtists.push({
                id: artistIdFromHandle(artist.handle), // stable hash, not random
                handle: artist.handle,
                name: artist.handle,
                shop: artist.shop_name,
                styles: analysis.styles,
                verified: true,
                quality_score: analysis.quality_score,
                is_apprentice: analysis.mentions_apprentice,
                source: 'crawled_verified',
            });
        } else {
            console.log(`❌ REJECTED (${analysis.unverified_reason || analysis.reason || 'unknown'})`);
            rejected++;
        }
    }

    // Atomic write so a crash here doesn't corrupt the output file.
    writeJsonAtomic(CONFIG.OUTPUT_FILE, verifiedArtists);

    console.log('');
    console.log(`[Validator] Done. Verified: ${verifiedArtists.length}, rejected: ${rejected}, failed: ${failed}.`);
    console.log(`[Validator] Wrote ${CONFIG.OUTPUT_FILE}`);
}

if (require.main === module) {
    runValidator().catch(err => {
        console.error('[Validator] Unhandled error:', err);
        process.exit(1);
    });
}

module.exports = { artistIdFromHandle, analyzeArtistPortfolio, runValidator };
