/**
 * Layer Decomposition Client Service
 *
 * Calls backend API to decompose an image into RGBA layers.
 */

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://127.0.0.1:3002/api';
const AUTH_TOKEN = import.meta.env.VITE_FRONTEND_AUTH_TOKEN;

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
