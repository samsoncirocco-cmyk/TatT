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

/**
 * Send a transactional email through whatever provider is configured.
 *
 * Provider resolution (honest degradation — never throws, never blocks callers):
 *   1. RESEND_API_KEY   → POST https://api.resend.com/emails
 *   2. EMAIL_WEBHOOK_URL → POST the payload as JSON to a generic webhook
 *   3. neither          → console.log the email (mock) and report unsent
 *
 * @param {Object} params
 * @param {string} params.to      - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.text    - Plain-text body
 * @param {string} [params.html]  - Optional HTML body
 * @param {string} [params.replyTo] - Optional Reply-To (e.g. a takedown
 *        requester, so an ops reply reaches the person who asked)
 * @returns {Promise<{sent: boolean, id?: string, reason?: string}>}
 */
export async function sendTransactionalEmail({ to, subject, text, html, replyTo }) {
    const from = process.env.EMAIL_FROM || 'TattTester <bookings@tatttester.com>';

    // 1. Resend (primary provider)
    if (process.env.RESEND_API_KEY) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from,
                    to,
                    subject,
                    text,
                    ...(html ? { html } : {}),
                    ...(replyTo ? { reply_to: replyTo } : {}),
                }),
            });

            if (!res.ok) {
                const detail = await res.text().catch(() => '');
                const reason = `resend responded ${res.status}: ${detail}`;
                console.error(`[EMAIL] Resend send failed — ${reason}`);
                return { sent: false, reason };
            }

            const body = await res.json().catch(() => ({}));
            return { sent: true, id: body.id };
        } catch (err) {
            const reason = `resend request threw: ${err?.message || String(err)}`;
            console.error(`[EMAIL] ${reason}`);
            return { sent: false, reason };
        }
    }

    // 2. Generic webhook fallback
    if (process.env.EMAIL_WEBHOOK_URL) {
        try {
            const res = await fetch(process.env.EMAIL_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from,
                    to,
                    subject,
                    text,
                    ...(html ? { html } : {}),
                    ...(replyTo ? { replyTo } : {}),
                }),
            });

            if (!res.ok) {
                const detail = await res.text().catch(() => '');
                const reason = `email webhook responded ${res.status}: ${detail}`;
                console.error(`[EMAIL] Webhook send failed — ${reason}`);
                return { sent: false, reason };
            }

            return { sent: true, id: undefined };
        } catch (err) {
            const reason = `email webhook request threw: ${err?.message || String(err)}`;
            console.error(`[EMAIL] ${reason}`);
            return { sent: false, reason };
        }
    }

    // 3. No provider configured — log-only mock (never throws)
    console.log('--------------------------------------------------');
    console.log(`[EMAIL] (no provider configured — not sent)`);
    console.log(`[EMAIL] From: ${from}`);
    console.log(`[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${text}`);
    console.log('--------------------------------------------------');
    return { sent: false, reason: 'no provider configured' };
}

const emailQueueService = {
    queueStencilExport,
    getQueueStatus,
    sendTransactionalEmail
};

export default emailQueueService;
