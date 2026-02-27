import { MetricServiceClient } from '@google-cloud/monitoring';
import { logger } from './logger';

/**
 * Cloud Monitoring client for writing custom metrics.
 *
 * Writes budget spend metric to Cloud Monitoring for alerting and dashboards.
 * Designed to never throw errors - monitoring must not break API requests.
 */

const projectId = process.env.GCP_PROJECT_ID;

let metricsClient: MetricServiceClient | null = null;

if (projectId) {
  try {
    metricsClient = new MetricServiceClient();
  } catch (error) {
    logger.warn({
      event_type: 'monitoring.init_failed',
      error: error instanceof Error ? error.message : String(error),
    }, '[Monitoring] Failed to initialize MetricServiceClient');
  }
}

/**
 * Write budget spent metric to Cloud Monitoring.
 *
 * Metric: custom.googleapis.com/budget/spent_cents
 * Labels: { period: 'monthly' }
 * Resource: global
 *
 * @param spentCents - Total budget spent in cents
 */
export async function writeBudgetMetric(spentCents: number): Promise<void> {
  // Graceful degradation for local dev
  if (!projectId) {
    logger.debug('[Monitoring] GCP_PROJECT_ID not set, skipping budget metric write');
    return;
  }

  if (!metricsClient) {
    logger.debug('[Monitoring] MetricServiceClient not initialized, skipping metric write');
    return;
  }

  try {
    const dataPoint = {
      interval: {
        endTime: {
          seconds: Math.floor(Date.now() / 1000),
        },
      },
      value: {
        int64Value: Math.floor(spentCents),
      },
    };

    const timeSeriesData = {
      metric: {
        type: 'custom.googleapis.com/budget/spent_cents',
        labels: {
          period: 'monthly',
        },
      },
      resource: {
        type: 'global',
        labels: {
          project_id: projectId,
        },
      },
      points: [dataPoint],
    };

    await metricsClient.createTimeSeries({
      name: metricsClient.projectPath(projectId),
      timeSeries: [timeSeriesData],
    });

    logger.debug({
      event_type: 'monitoring.metric_written',
      metric_type: 'budget/spent_cents',
      value: spentCents,
    }, '[Monitoring] Budget metric written successfully');
  } catch (error) {
    // Never throw - monitoring failures should not break API requests
    logger.warn({
      event_type: 'monitoring.metric_write_failed',
      spent_cents: spentCents,
      error: error instanceof Error ? error.message : String(error),
    }, '[Monitoring] Failed to write budget metric');
  }
}
