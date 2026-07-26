/**
 * Type declarations for the email queue service (.js companion).
 * Replaces the @ts-ignore in src/app/api/v1/stencil/export/route.ts.
 */

export interface StencilExportRequest {
  design_id: string;
  dimensions: { width: number; height: number };
  format?: string;
  include_metadata?: boolean;
  artist_info?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface QueueEntry {
  id: string;
  data: StencilExportRequest;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  resultUrl?: string;
  retryCount: number;
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Reply-To header — e.g. the takedown requester, so an ops reply reaches them. */
  replyTo?: string;
}

export interface TransactionalEmailResult {
  sent: boolean;
  id?: string;
  reason?: string;
}

export function queueStencilExport(data: StencilExportRequest): string;
export function getQueueStatus(queueId: string): QueueEntry | undefined;
export function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<TransactionalEmailResult>;

declare const emailQueueService: {
  queueStencilExport: typeof queueStencilExport;
  getQueueStatus: typeof getQueueStatus;
  sendTransactionalEmail: typeof sendTransactionalEmail;
};

export default emailQueueService;
