import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

async function inspectWorkflow() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    const workflowId = '75503147344594731'; // Inspecting 'Social Links Scraper-0121'

    if (!apiKey) {
        console.error('Error: BROWSERACT_API_KEY not found in .env');
        process.exit(1);
    }

    const client = new BrowserActClient(apiKey);
    console.log(`Inspecting workflow ${workflowId}...`);

    try {
        const workflow = await client.getWorkflow(workflowId);
        console.log('\nWorkflow Details:');
        console.log('-----------------');
        console.log(`Name: ${workflow.name}`);
        console.log(`Description: ${workflow.description}`);
        console.log(`Created: ${workflow.created_at}`);

        console.log('\nInput Parameters:');
        if (workflow.input_parameters && workflow.input_parameters.length > 0) {
            workflow.input_parameters.forEach(param => {
                console.log(`- ${param.name} (Default enabled: ${param.default_enabled})`);
            });
        } else {
            console.log('No input parameters defined.');
        }

    } catch (error) {
        console.error('Failed to inspect workflow:', error.message);
    }
}

inspectWorkflow();
