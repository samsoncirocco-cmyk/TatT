import fs from 'fs';
import path from 'path';
import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

// Configuration
const CONFIG = {
    INPUT_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/output/verified_artists_production.json'),
    // We'll also read raw shops to find ones that haven't been processed into artists yet if needed
    // But primarily we want to enrich shops that have a website but no social links
    RAW_SHOPS_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/output/raw_artists_production.json'),
    OUTPUT_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/output/enriched_social_data.json'),
    WORKFLOW_ID: '75503147344594731', // Social Links Scraper
    BATCH_SIZE: 5,
    DELAY_BETWEEN_BATCHES: 2000
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichShops() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    if (!apiKey) {
        console.error('Error: BROWSERACT_API_KEY not found');
        return;
    }

    const client = new BrowserActClient(apiKey);
    let shopsToEnrich = [];

    // Load shops from raw data that have website but no instagram
    if (fs.existsSync(CONFIG.RAW_SHOPS_FILE)) {
        const rawData = JSON.parse(fs.readFileSync(CONFIG.RAW_SHOPS_FILE, 'utf8'));

        // Filter unique shops
        const uniqueShops = new Map();
        if (Array.isArray(rawData)) {
            rawData.forEach(shop => {
                // If shop has website but NO artists found yet, or artists lists are empty/minimal
                if (shop.website && (!shop.artists || shop.artists.length === 0)) {
                    if (!uniqueShops.has(shop.website)) {
                        uniqueShops.set(shop.website, {
                            name: shop.name,
                            city: shop.city,
                            website: shop.website
                        });
                    }
                }
            });
        }

        shopsToEnrich = Array.from(uniqueShops.values());
        console.log(`Found ${shopsToEnrich.length} shops candidates for enrichment`);
    }

    // Limit to first 20 for testing/quota management
    shopsToEnrich = shopsToEnrich.slice(0, 20);
    console.log(`Processing batch of ${shopsToEnrich.length} shops...`);

    const results = [];

    // Process in batches
    for (let i = 0; i < shopsToEnrich.length; i += CONFIG.BATCH_SIZE) {
        const batch = shopsToEnrich.slice(i, i + CONFIG.BATCH_SIZE);
        const promises = batch.map(async (shop) => {
            try {
                process.stdout.write(`enriching ${shop.name}... `);
                const task = await client.runTask(CONFIG.WORKFLOW_ID, [
                    { name: 'Website_URL', value: shop.website }
                ]);

                // Poll for completion (simple version)
                let attempts = 0;
                while (attempts < 30) {
                    await sleep(3000);
                    const info = await client.getTask(task.id);
                    if (info.status === 'finished') {
                        process.stdout.write(`✅\n`);
                        return { shop, success: true, services: info.output };
                    } else if (info.status === 'failed') {
                        process.stdout.write(`❌\n`);
                        return { shop, success: false, error: info.task_failure_info };
                    }
                    attempts++;
                }
                return { shop, success: false, error: 'Timeout' };
            } catch (e) {
                console.error(`Error: ${e.message}`);
                return { shop, success: false, error: e.message };
            }
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);

        // Save intermediate results
        fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(results, null, 2));
        await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
    }

    console.log('Enrichment complete!');
}

enrichShops();
