/**
 * Layer Decomposition Client Service
 *
 * Calls backend API to decompose an image into RGBA layers.
 */

const PROXY_URL = '/api';
const AUTH_TOKEN = process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production';

export async function decomposeLayers(imageUrl, designId, userId) {
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
