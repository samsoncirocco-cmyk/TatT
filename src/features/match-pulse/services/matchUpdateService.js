const PROXY_URL = '/api';
const AUTH_TOKEN = process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production';

export async function requestMatchUpdate(payload) {
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
