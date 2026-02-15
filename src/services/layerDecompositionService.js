/**
 * Layer Decomposition Client Service
 *
 * Calls backend API to decompose an image into RGBA layers.
 */

const PROXY_URL = '/api';

export async function decomposeLayers(imageUrl, designId, userId) {
  const response = await fetch(`${PROXY_URL}/v1/layers/decompose`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
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
