/**
 * Match Update Service
 *
 * Client service for requesting backend match updates via API
 */

// ============================================================================
// Types
// ============================================================================

export interface MatchUpdatePayload {
  designId: string;
  userId: string;
  preferences?: {
    location?: string;
    budget?: number;
    styles?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MatchUpdateResponse {
  success: boolean;
  matches?: unknown[];
  error?: string;
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const PROXY_URL = '/api';
const AUTH_TOKEN = process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production';

// ============================================================================
// Public API
// ============================================================================

/**
 * Request match update from backend API
 *
 * @param payload - Match update request payload
 * @returns Match update response with artists
 */
export async function requestMatchUpdate(payload: MatchUpdatePayload): Promise<MatchUpdateResponse> {
  const response = await fetch(`${PROXY_URL}/v1/match/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Match update failed: ${response.status} ${text}`);
  }

  return response.json();
}
