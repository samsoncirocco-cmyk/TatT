import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

async function forceTest() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    const workflowId = '75503147344594731'; // Social Links Scraper

    if (!apiKey) {
        console.error('Error: BROWSERACT_API_KEY not found');
        return;
    }

    const client = new BrowserActClient(apiKey);

    // Use a real tattoo shop URL that we know exists
    const testUrl = 'https://www.savedtattoo.com';

    console.log(`Force testing BrowserAct with ${testUrl}...`);

    try {
        const task = await client.runTask(workflowId, [
            { name: 'Website_URL', value: testUrl }
        ]);
        console.log(`✅ Task sent! ID: ${task.id}`);
        console.log('Check your BrowserAct dashboard now - you should see this running.');
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

forceTest();
