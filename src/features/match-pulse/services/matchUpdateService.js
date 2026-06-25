const PROXY_URL = '/api';

export async function requestMatchUpdate(payload) {
  const response = await fetch(`${PROXY_URL}/v1/match/update`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Match update failed: ${response.status} ${text}`);
  }

  return response.json();
}
