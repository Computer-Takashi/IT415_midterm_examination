// Integration check: creates three simulated transactions in the configured project.
import assert from 'node:assert/strict';
import { BACKEND } from '../public/backend-config.js';

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND.anonKey}`, apikey: BACKEND.anonKey };
const post = body => fetch(BACKEND.url, { method: 'POST', headers, body: JSON.stringify(body) });
const order = (method, paid) => ({ requestId: crypto.randomUUID(), items: [{ id: 'coffee', quantity: 2 }, { id: 'sandwich', quantity: 1 }], method, paid });
const receipts = [];
for (const method of ['Cash', 'QR Payment', 'Credit/Debit Card']) {
  const body = order(method, method === 'Cash' ? 20000 : 14000);
  const response = await post(body);
  assert.equal(response.status, 200, `${method}: ${await response.clone().text()}`);
  const receipt = await response.json();
  assert.equal(receipt.total, 14000);
  assert.equal(receipt.count, 3);
  assert.equal(receipt.change, method === 'Cash' ? 6000 : 0);
  assert.equal(receipt.lines.reduce((sum, line) => sum + line.subtotal, 0), 14000);
  const retry = await post(body);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).reference, receipt.reference, 'Retry must return the original transaction');
  assert.equal((await post({ ...body, paid: 25000 })).status, 400, 'Changed retry must fail');
  receipts.push({ method, reference: receipt.reference, total: receipt.total, change: receipt.change });
}
for (const invalid of [
  order('Cash', 13999), order('Cash', -1), order('Cash', null), order('QR Payment', 15000),
  { ...order('Cash', 20000), items: [] },
  { ...order('Cash', 20000), items: [{ id: 'unknown', quantity: 1 }] },
  { ...order('Cash', 20000), items: [{ id: 'coffee', quantity: 0 }] },
  { ...order('Cash', 20000), items: [{ id: 'coffee', quantity: 1 }, { id: 'coffee', quantity: 1 }] }
]) assert.equal((await post(invalid)).status, 400, 'Invalid order must be rejected');
assert.equal((await fetch(BACKEND.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order('Cash', 20000)) })).status, 401);
const origin = new URL(BACKEND.url).origin;
for (const table of ['kiosk_products', 'kiosk_transactions', 'kiosk_transaction_items']) {
  const result = await fetch(`${origin}/rest/v1/${table}?select=*`, { headers });
  assert.ok([401, 403].includes(result.status), `${table} should deny public reads`);
}
console.log(JSON.stringify({ result: 'PASS', receipts, checks: 'All methods; idempotency; changed retries; invalid inputs; gateway auth; public read denial' }, null, 2));
