import axios from 'axios';

/**
 * BrowserAct API Client
 * Wraps the BrowserAct V2 API for workflow automation.
 */
export class BrowserActClient {
    /**
     * @param {string} apiKey - Your BrowserAct API Key
     */
    constructor(apiKey) {
        if (!apiKey) throw new Error('BrowserAct API Key is required');
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.browseract.com/v2';
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get workflow details
     * @param {string} workflowId 
     */
    async getWorkflow(workflowId) {
        try {
            const response = await this.client.get('/workflow/get-workflow', {
                params: { workflow_id: workflowId }
            });
            return response.data;
        } catch (error) {
            this._handleError('getWorkflow', error);
        }
    }

    /**
     * List available workflows
     * @param {number} page 
     * @param {number} limit 
     */
    async listWorkflows(page = 1, limit = 20) {
        try {
            const response = await this.client.get('/workflow/list-workflows', {
                params: { page, limit }
            });
            return response.data;
        } catch (error) {
            this._handleError('listWorkflows', error);
        }
    }

    /**
     * Run a workflow task
     * @param {string} workflowId 
     * @param {Array<{name: string, value: string}>} inputParameters 
     * @param {boolean} saveBrowserData 
     */
    async runTask(workflowId, inputParameters, saveBrowserData = false) {
        try {
            const response = await this.client.post('/workflow/run-task', {
                workflow_id: workflowId,
                input_parameters: inputParameters,
                save_browser_data: saveBrowserData
            });
            return response.data; // Returns { id: "task_id", profile_id: "..." }
        } catch (error) {
            this._handleError('runTask', error);
        }
    }

    /**
     * Get task status
     * @param {string} taskId 
     */
    async getTaskStatus(taskId) {
        try {
            const response = await this.client.get('/workflow/get-task-status', {
                params: { task_id: taskId }
            });
            return response.data; // { status: "..." }
        } catch (error) {
            this._handleError('getTaskStatus', error);
        }
    }

    /**
     * Get full task details and output
     * @param {string} taskId 
     */
    async getTask(taskId) {
        try {
            const response = await this.client.get('/workflow/get-task', {
                params: { task_id: taskId }
            });
            return response.data;
        } catch (error) {
            this._handleError('getTask', error);
        }
    }

    /**
     * Stop a running task
     * @param {string} taskId 
     */
    async stopTask(taskId) {
        try {
            await this.client.put('/workflow/stop-task', null, {
                params: { task_id: taskId }
            });
            return true;
        } catch (error) {
            this._handleError('stopTask', error);
        }
    }

    _handleError(method, error) {
        const msg = error.response?.data?.message || error.message;
        console.error(`[BrowserAct] ${method} failed: ${msg}`);
        throw error;
    }
}
