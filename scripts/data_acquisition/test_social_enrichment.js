import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

async function testSocialEnrichment() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    const workflowId = '75503147344594731'; // Social Links Scraper

    if (!apiKey) {
        console.error('Error: BROWSERACT_API_KEY not found in .env');
        process.exit(1);
    }

    const client = new BrowserActClient(apiKey);
    console.log(`Testing Social Links Scraper (${workflowId})...`);

    // Test URL: A random tattoo shop or generic site
    const testUrl = 'https://www.google.com';

    try {
        // Confirmed parameter name from user documentation
        const task = await client.runTask(workflowId, [
            { name: 'Website_URL', value: testUrl }
        ]);

        console.log(`Task started! ID: ${task.id}`);

        let status = 'running';
        while (status === 'running' || status === 'created') {
            await new Promise(r => setTimeout(r, 2000));
            const info = await client.getTask(task.id);
            status = info.status;
            process.stdout.write(`\rStatus: ${status}`);

            if (status === 'finished') {
                console.log('\n\nSUCCESS! Output:');
                console.log(JSON.stringify(info.output, null, 2));
            } else if (status === 'failed') {
                console.log('\n\nFAILED.');
                console.log('Error:', info.task_failure_info);
            }
        }

    } catch (error) {
        console.error('\nAPI Error:', error.response?.data || error.message);
    }
}

testSocialEnrichment();
