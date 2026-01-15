const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://127.0.0.1:3002/api';
const AUTH_TOKEN = import.meta.env.VITE_FRONTEND_AUTH_TOKEN;

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
