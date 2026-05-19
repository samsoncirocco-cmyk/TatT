import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CONFIG = {
    RAW_INPUT: 'src/scripts/data_acquisition/output/raw_artists_parallel.json',
    SHARDS: 4,
    OUTPUT_DIR: 'src/scripts/data_acquisition/output'
};

async function shardAndValidate() {
    console.log('🚀 Starting Continuous Parallel Validation...');

    while (true) {
        if (!fs.existsSync(CONFIG.RAW_INPUT)) {
            console.error('❌ Raw input file not found. Waiting...');
            await new Promise(r => setTimeout(r, 5000));
            continue;
        }

        console.log(`\n⏳ Loading latest data from ${CONFIG.RAW_INPUT}...`);
        let rawData = JSON.parse(fs.readFileSync(CONFIG.RAW_INPUT, 'utf8'));

        // Handle parallel crawler format
        if (!Array.isArray(rawData) && rawData.results) {
            rawData = rawData.results;
        }

        // Flatten to artist list first to ensure even distribution
        const allArtists = [];
        rawData.forEach(shop => {
            if (shop.artists && shop.artists.length > 0) {
                shop.artists.forEach(artist => {
                    allArtists.push({
                        ...artist,
                        shop_name: shop.name,
                        shop_city: shop.city,
                        shop_rating: shop.rating
                    });
                });
            }
        });

        console.log(`📦 Total Raw Artists: ${allArtists.length}`);
        const shardSize = Math.ceil(allArtists.length / CONFIG.SHARDS);

        // Spawn validators
        const activeProcesses = [];

        for (let i = 0; i < CONFIG.SHARDS; i++) {
            const start = i * shardSize;
            const end = start + shardSize;
            const shardData = allArtists.slice(start, end);

            // We need to wrap it back in a structure the validator expects (or just modify validator to accept flat array, 
            // but validator handles flat arrays too based on lines 181-185).
            // Validator expects: Array of Shops OR Array of Artists.
            // Let's wrap in a dummy structure to be safe since validator flattens it again.
            // Actually, validator lines 185 check if (!Array.isArray).
            // Let's just save the flat array of artists for this shard.
            // BUT wait, validator line 192 expects `shop.artists`.
            // So we need to wrap it back into a "shop" object or modify validator to handle flat artists.
            // Let's modify the validator input logic in `production_validator.js`?
            // No, easier to just wrap here.

            const shardWrapped = [{
                name: "Shard Batch " + i,
                city: "Shard City",
                artists: shardData
            }];

            const shardInputFile = path.join(CONFIG.OUTPUT_DIR, `raw_shard_${i}.json`);
            const shardOutputFile = path.join(CONFIG.OUTPUT_DIR, `verified_shard_${i}.json`);
            const shardProgressFile = path.join(CONFIG.OUTPUT_DIR, `progress_shard_${i}.json`);

            fs.writeFileSync(shardInputFile, JSON.stringify(shardWrapped, null, 2));

            console.log(`▶️ Spawning Validator #${i} (${shardData.length} artists)`);

            const p = spawn('node', ['src/scripts/data_acquisition/production_validator.js'], {
                stdio: 'ignore', // Ignore stdout to keep main log clean
                env: {
                    ...process.env,
                    VALIDATOR_INPUT: shardInputFile,
                    VALIDATOR_OUTPUT: shardOutputFile,
                    VALIDATOR_PROGRESS: shardProgressFile
                }
            });
            activeProcesses.push(p);
        }

        console.log(`✅ All validators spawned. Waiting 5 minutes for next refresh...`);

        // Wait for 5 minutes before killing/restarting
        // This allows validators to chew through the current batch
        // We kill them to ensure we pick up the NEW data from the crawler in the next cycle
        await new Promise(r => setTimeout(r, 5 * 60 * 1000));

        console.log(`🔄 Refreshing validation pipeline...`);
        activeProcesses.forEach(p => p.kill());
    }
}

shardAndValidate();
