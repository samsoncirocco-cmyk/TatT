import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

async function testWorkflow() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    const workflowId = '75496935588721451'; // The newest workflow found

    if (!apiKey) {
        console.error('Error: BROWSERACT_API_KEY not found in .env');
        process.exit(1);
    }

    const client = new BrowserActClient(apiKey);
    console.log(`Starting test run for workflow ${workflowId}...`);

    try {
        // Try running with the expected parameters
        const task = await client.runTask(workflowId, [
            { name: 'City', value: 'Austin, TX' },
            { name: 'MaxShops', value: '2' }
        ]);

        console.log(`Task started! ID: ${task.id}`);
        console.log('Waiting for completion...');

        // Poll for status
        let status = 'running';
        let retries = 0;

        while (status === 'running' || status === 'created' || status === 'pausing') {
            await new Promise(r => setTimeout(r, 5000)); // Wait 5s
            const taskInfo = await client.getTask(task.id);
            status = taskInfo.status;
            process.stdout.write(`\rStatus: ${status} | Live URL: ${taskInfo.live_url_info?.live_url || 'N/A'}`);

            if (retries++ > 60) { // Timeout after ~5 mins
                console.log('\nTimeout waiting for task.');
                break;
            }
        }

        console.log('\nTask finished!');

        // Fetch final result
        const finalTask = await client.getTask(task.id);
        if (finalTask.status === 'finished') {
            console.log('Output:', finalTask.output?.string);
            if (finalTask.output?.files && finalTask.output.files.length > 0) {
                console.log('Files:', finalTask.output.files);
            }
        } else {
            console.log('Task failed or stopped.');
            if (finalTask.task_failure_info) {
                console.log('Failure Info:', finalTask.task_failure_info);
            }
        }

    } catch (error) {
        console.error('\nFailed to run workflow:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

testWorkflow();
