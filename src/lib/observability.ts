type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  type: string;
  data: Record<string, unknown>;
}

const MAX_LOGS = 200;
const GLOBAL_KEY = '__tattRecentLogs';

function getLogStore(): LogEntry[] {
  const globalAny = globalThis as typeof globalThis & { [GLOBAL_KEY]?: LogEntry[] };
  if (!globalAny[GLOBAL_KEY]) {
    globalAny[GLOBAL_KEY] = [];
  }
  return globalAny[GLOBAL_KEY] as LogEntry[];
}

function createLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function logEvent(type: string, data: Record<string, unknown>, level: LogLevel = 'info') {
  const entry: LogEntry = {
    id: createLogId(),
    timestamp: new Date().toISOString(),
    level,
    type,
    data
  };

  const store = getLogStore();
  store.push(entry);
  if (store.length > MAX_LOGS) {
    store.splice(0, store.length - MAX_LOGS);
  }

  try {
    console.log(JSON.stringify(entry));
  } catch {
    console.log('[observability]', entry);
  }
}

export function getRecentLogs(limit = 100): LogEntry[] {
  const store = getLogStore();
  if (limit <= 0) return [];
  return store.slice(-Math.min(limit, store.length));
}
