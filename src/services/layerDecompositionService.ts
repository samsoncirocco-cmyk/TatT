/**
 * Layer Decomposition Client Service
 *
 * Calls backend API to decompose an image into RGBA layers.
 */

// ============================================================================
// Types
// ============================================================================

export interface DecomposeLayersRequest {
  imageUrl: string;
  designId: string;
  userId: string;
}

export interface DecomposeLayersResponse {
  success: boolean;
  layers?: {
    red: string;
    green: string;
    blue: string;
    alpha: string;
  };
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
 * Decompose image into RGBA layers via backend API
 *
 * @param imageUrl - URL of image to decompose
 * @param designId - Design identifier
 * @param userId - User identifier
 * @returns Decomposed layer URLs
 */
export async function decomposeLayers(
  imageUrl: string,
  designId: string,
  userId: string
): Promise<DecomposeLayersResponse> {
  const response = await fetch(`${PROXY_URL}/v1/layers/decompose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify({
      imageUrl,
      designId,
      userId
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Decompose failed: ${response.status} ${text}`);
  }

  return response.json();
}
