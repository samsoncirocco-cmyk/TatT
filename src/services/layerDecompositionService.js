/**
 * Layer Decomposition Client Service
 *
 * Calls backend API to decompose an image into RGBA layers.
 */
import { getApiAuthHeaders } from '@/lib/client-api-auth';

const PROXY_URL = '/api';

export async function decomposeLayers(imageUrl, designId, userId) {
  const authHeaders = await getApiAuthHeaders();
  const response = await fetch(`${PROXY_URL}/v1/layers/decompose`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
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
