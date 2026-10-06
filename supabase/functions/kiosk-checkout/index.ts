// verify_jwt is enabled at the Supabase gateway. This public demo accepts the
// application's low-privilege anon JWT; it never grants direct database access.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const text = await request.text();
    if (text.length > 4096) return reply({ error: 'Request too large' }, 413);
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId) ||
      !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 6 ||
      !['Cash', 'QR Payment', 'Credit/Debit Card'].includes(body.method) || !Number.isSafeInteger(body.paid) ||
      body.items.some((item: {id: string; quantity: number}) => !item || typeof item.id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) {
      return reply({ error: 'Invalid order or payment' }, 400);
    }
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'Checkout unavailable' }, 503);
    const response = await fetch(`${url}/rest/v1/rpc/kiosk_checkout`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_request_id: body.requestId, p_items: body.items, p_method: body.method, p_paid: body.paid })
    });
    if (!response.ok) return reply({ error: 'Order or payment rejected' }, response.status >= 500 ? 503 : 400);
    return reply(await response.json());
  } catch { return reply({ error: 'Checkout could not be completed' }, 400); }
});
