import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

// Configuration
const CONFIG = {
    WORKFLOW_ID: '75503147344594731', // Social Links Scraper
    CITIES: [
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami',
        'Austin', 'Seattle', 'Denver', 'Atlanta', 'Portland'
    ],
    // The "Google Dork" prompt
    SEARCH_TEMPLATE: (city) => `site:instagram.com "tattoo artist" "${city}" ("@gmail.com" OR "@outlook.com") "bio" -jobs`,
    MAX_CONCURRENT: 2
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDirectSearch() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    if (!apiKey) {
        console.error('Error: BROWSERACT_API_KEY not found');
        return;
    }

    const client = new BrowserActClient(apiKey);

    console.log(`Starting Direct Artist Search for ${CONFIG.CITIES.length} cities...`);

    for (const city of CONFIG.CITIES) {
        const query = CONFIG.SEARCH_TEMPLATE(city);
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

        console.log(`\n[${city}] Launching search: ${query}`);

        try {
            const task = await client.runTask(CONFIG.WORKFLOW_ID, [
                { name: 'Website_URL', value: searchUrl }
            ]);

            console.log(`[${city}] Task started: ${task.id}`);

            // We don't wait for completion here, we let them run in background
            // BrowserAct will handle the heavy lifting
            await sleep(2000);

        } catch (e) {
            console.error(`[${city}] Failed to start: ${e.message}`);
        }
    }

    console.log('\nAll search tasks dispatched!');
}

runDirectSearch();
