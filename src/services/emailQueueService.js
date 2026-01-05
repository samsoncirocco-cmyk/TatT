/**
 * Email Notification & Queue Service
 * 
 * Handles queuing of late-running or failed tasks (like stencil export)
 * and "sending" notifications when services recover.
 */

const exportQueue = [];

/**
 * Queue a stencil export for background processing
 * @param {Object} data - Export request data 
 * @returns {string} Queue ID
 */
export const queueStencilExport = (data) => {
    const queueId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entry = {
        id: queueId,
        data,
        status: 'pending',
        createdAt: new Date(),
        retryCount: 0
    };

    exportQueue.push(entry);
    console.log(`[Queue] Task ${queueId} added to export queue.`);

    // Simulate background processing
    processQueue();

    return queueId;
};

/**
 * Process the export queue (Simulated)
 */
async function processQueue() {
    const pending = exportQueue.filter(t => t.status === 'pending');

    for (const task of pending) {
        task.status = 'processing';

        // Simulate processing time
        setTimeout(() => {
            task.status = 'completed';
            task.completedAt = new Date();
            task.resultUrl = `https://cdn.tattester.com/stencils/${task.data.design_id}_stencil.pdf`;

            sendNotification(task);
        }, 2000);
    }
}

/**
 * "Send" a notification (Mock)
 * @param {Object} task - Completed task
 */
function sendNotification(task) {
    const { data, resultUrl } = task;
    console.log('--------------------------------------------------');
    console.log(`[EMAIL] To: user@example.com`);
    console.log(`[EMAIL] Subject: Your Stencil for Design ${data.design_id} is Ready!`);
    console.log(`[EMAIL] Body: Your 300 DPI stencil has been generated and is ready for download.`);
    console.log(`[EMAIL] Link: ${resultUrl}`);
    console.log('--------------------------------------------------');
}

/**
 * Get status of a queued task
 * @param {string} queueId - ID of the task
 */
export const getQueueStatus = (queueId) => {
    return exportQueue.find(t => t.id === queueId);
};

const emailQueueService = {
    queueStencilExport,
    getQueueStatus
};

export default emailQueueService;
