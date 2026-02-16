import pino from 'pino';

/**
 * Pino logger configured for GCP Cloud Logging.
 *
 * Maps Pino log levels to GCP severity strings and formats logs
 * for optimal Cloud Logging ingestion and BigQuery export.
 */

// GCP severity mapping
const levelToGCPSeverity = {
  10: 'DEBUG',    // trace
  20: 'DEBUG',    // debug
  30: 'INFO',     // info
  40: 'WARNING',  // warn
  50: 'ERROR',    // error
  60: 'CRITICAL', // fatal
};

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  messageKey: 'message', // GCP expects 'message', not 'msg'
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label, number) {
      return {
        severity: levelToGCPSeverity[number as keyof typeof levelToGCPSeverity] || 'INFO',
        level: number,
      };
    },
    log(object) {
      // Map OpenTelemetry trace fields to GCP fields
      const gcpObject: Record<string, any> = { ...object };

      if (object.trace_id) {
        gcpObject['logging.googleapis.com/trace'] = object.trace_id;
        delete gcpObject.trace_id;
      }

      if (object.span_id) {
        gcpObject['logging.googleapis.com/spanId'] = object.span_id;
        delete gcpObject.span_id;
      }

      if (object.trace_flags === '01') {
        gcpObject['logging.googleapis.com/trace_sampled'] = true;
        delete gcpObject.trace_flags;
      }

      return gcpObject;
    },
  },
});

/**
 * Create a request logger for consistent event logging across routes.
 *
 * @param routeName - Name of the API route (e.g., 'generate', 'council', 'match')
 * @returns Object with start, complete, and error logging methods
 */
export function createRequestLogger(routeName: string) {
  let startTime: number;

  return {
    /**
     * Log request start event
     */
    start(event_type: string, metadata: Record<string, unknown> = {}) {
      startTime = Date.now();
      logger.info({
        event_type,
        route: routeName,
        phase: 'start',
        ...metadata,
      });
    },

    /**
     * Log request completion event with duration
     */
    complete(event_type: string, metadata: Record<string, unknown> = {}) {
      const duration_ms = Date.now() - startTime;
      logger.info({
        event_type,
        route: routeName,
        phase: 'complete',
        duration_ms,
        ...metadata,
      });
    },

    /**
     * Log request error event with full Error object
     */
    error(event_type: string, err: Error, metadata: Record<string, unknown> = {}) {
      const duration_ms = Date.now() - startTime;
      logger.error({
        event_type,
        route: routeName,
        phase: 'error',
        duration_ms,
        err, // Pino serializes Error with stack trace
        ...metadata,
      });
    },
  };
}

export { logger };
