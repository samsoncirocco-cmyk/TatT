import { BrowserActClient } from './browseract_client.js';
import 'dotenv/config';

async function checkTask() {
    const apiKey = process.env.BROWSERACT_API_KEY;
    const taskId = '75505763826939179';

    const client = new BrowserActClient(apiKey);
    console.log(`Checking task ${taskId}...`);

    try {
        const info = await client.getTask(taskId);
        console.log(`Status: ${info.status}`);
        if (info.status === 'finished') {
            console.log('Output:', JSON.stringify(info.output, null, 2));
        } else if (info.status === 'failed') {
            console.log('Error:', info.task_failure_info);
        }
    } catch (e) {
        console.error(e.message);
    }
}

checkTask();
