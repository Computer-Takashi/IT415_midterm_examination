import { BACKEND } from './backend-config.js';

export async function savePayment(pending) {
  const response = await fetch(BACKEND.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND.anonKey}`, apikey: BACKEND.anonKey },
    body: JSON.stringify({
      requestId: pending.requestId,
      items: pending.lines.map(({ id, quantity }) => ({ id, quantity })),
      method: pending.method,
      paid: pending.paid
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Your payment could not be confirmed. Check your connection and retry.');
  return response.json();
}
