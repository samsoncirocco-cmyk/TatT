import { CloudTasksClient } from '@google-cloud/tasks';

const DEFAULT_LOCATION = process.env.GCP_LOCATION || process.env.GCP_REGION || 'us-central1';
const NUM_BUCKETS = 20;

type EnqueuePayload = {
  prompt: string;
  parameters?: Record<string, unknown>;
  designId: string;
  versionId: string;
};

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[GenerationQueue] Missing required env var: ${name}`);
  }
  return value;
}

// djb2 hash -> uint32
export function hashCode(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getQueueName(userId: string): string {
  const bucket = hashCode(userId) % NUM_BUCKETS;
  return `generation-bucket-${bucket}`;
}

function getClient(): CloudTasksClient {
  return new CloudTasksClient();
}

async function ensureQueueExists(queueName: string): Promise<void> {
  const client = getClient();
  const project = assertEnv('GCP_PROJECT_ID', process.env.GCP_PROJECT_ID);
  const location = DEFAULT_LOCATION;

  const queuePath = client.queuePath(project, location, queueName);
  try {
    await client.getQueue({ name: queuePath });
    return;
  } catch (err: any) {
    const code = err?.code;
    // gRPC NOT_FOUND = 5
    if (code !== 5 && code !== 404) {
      throw err;
    }
  }

  const parent = client.locationPath(project, location);
  try {
    await client.createQueue({
      parent,
      queue: {
        name: queuePath,
        rateLimits: {
          maxConcurrentDispatches: 3,
          maxDispatchesPerSecond: 1,
        },
        retryConfig: {
          maxAttempts: 3,
        },
      },
    });
  } catch (err: any) {
    // gRPC ALREADY_EXISTS = 6
    if (err?.code === 6) return;
    throw err;
  }
}

export async function enqueueGenerationTask(userId: string, payload: EnqueuePayload): Promise<string> {
  const client = getClient();
  const project = assertEnv('GCP_PROJECT_ID', process.env.GCP_PROJECT_ID);
  const location = DEFAULT_LOCATION;
  const cloudRunUrl = assertEnv('CLOUD_RUN_URL', process.env.CLOUD_RUN_URL);
  const serviceAccountEmail = assertEnv('TASK_SERVICE_ACCOUNT', process.env.TASK_SERVICE_ACCOUNT);

  const queueName = getQueueName(userId);
  await ensureQueueExists(queueName);

  const parent = client.queuePath(project, location, queueName);
  const taskUrl = `${cloudRunUrl.replace(/\/+$/, '')}/api/v1/tasks/generate`;

  const body = Buffer.from(JSON.stringify({ userId, ...payload })).toString('base64');

  const [task] = await client.createTask({
    parent,
    task: {
      httpRequest: {
        httpMethod: 'POST',
        url: taskUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        oidcToken: {
          serviceAccountEmail,
        },
      },
    },
  });

  if (!task?.name) {
    throw new Error('[GenerationQueue] Cloud Tasks did not return a task name');
  }
  return task.name;
}

export async function getQueueStatus(userId: string): Promise<{ pendingTasks: number }> {
  const client = getClient();
  const project = assertEnv('GCP_PROJECT_ID', process.env.GCP_PROJECT_ID);
  const location = DEFAULT_LOCATION;

  const queueName = getQueueName(userId);
  const parent = client.queuePath(project, location, queueName);

  // Note: listTasks may require additional IAM; treat as optional utility.
  const [tasks] = await client.listTasks({ parent });
  return { pendingTasks: tasks?.length ?? 0 };
}

