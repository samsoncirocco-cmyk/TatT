import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

async function listWorkflows() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    if (!apiKey) {
        console.error('Error: BROWSERACT_API_KEY not found in .env');
        process.exit(1);
    }

    const client = new BrowserActClient(apiKey);
    console.log('Fetching workflows...');

    try {
        const workflows = await client.listWorkflows();
        console.log('\nAvailable Workflows:');
        console.log('===================');
        if (workflows.items.length === 0) {
            console.log('No workflows found. You may need to create one in the BrowserAct dashboard.');
        } else {
            workflows.items.forEach(wf => {
                console.log(`- [${wf.id}] ${wf.name}`);
                console.log(`  Description: ${wf.description || 'N/A'}`);
            });
        }
    } catch (error) {
        console.error('Failed to list workflows:', error.message);
    }
}

listWorkflows();
