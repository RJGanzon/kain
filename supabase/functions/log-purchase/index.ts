// log-purchase (KAIN_BUILD_PROMPT §6): the only way a price enters the
// prices table from a person. Recomputes the unit price, compares it with
// the market's price (ignoring other people's logs when the current price is
// itself a log), saves it as a user_log price — accepted within ±30%,
// flagged otherwise — and always records the purchase.
//
// POST { id, ingredient_id, qty, total_price, market_id, logged_at? }
//   id: uuid made on the phone, so a retried upload can't log twice
//   qty: grams (kg items), ml (L items) or a count

import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkPrice, type Unit } from '../_shared/price-check.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function manilaDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who, error: authError } = await admin.auth.getUser(token);
  if (authError || !who.user) return json({ error: 'Sign in to log purchases to your account.' }, 401);
  const userId = who.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }
  const id = String(body.id ?? '');
  const ingredientId = String(body.ingredient_id ?? '');
  const marketId = String(body.market_id ?? '');
  const qty = Number(body.qty);
  const total = Number(body.total_price);
  const loggedAt = body.logged_at ? new Date(String(body.logged_at)) : new Date();
  if (!UUID.test(id)) return json({ error: 'id must be a uuid' }, 400);
  if (!(qty > 0 && qty < 1_000_000)) return json({ error: 'qty must be a positive amount' }, 400);
  if (!(total > 0 && total < 100_000)) return json({ error: 'total_price must be between ₱0 and ₱100,000' }, 400);
  if (Number.isNaN(loggedAt.getTime()) || loggedAt.getTime() > Date.now() + 5 * 60_000) return json({ error: 'logged_at is not a valid time' }, 400);

  // Already logged (a retry from the phone's offline queue)?
  const existing = await admin.from('purchase_logs').select('id, user_id, status, unit_price, price_id').eq('id', id).maybeSingle();
  if (existing.data) {
    if (existing.data.user_id !== userId) return json({ error: 'id already used' }, 409);
    return json({ id, status: existing.data.status, unit_price: Number(existing.data.unit_price), duplicate: true });
  }

  const [ing, market] = await Promise.all([
    admin.from('ingredients').select('id, unit').eq('id', ingredientId).maybeSingle(),
    admin.from('markets').select('id').eq('id', marketId).maybeSingle(),
  ]);
  if (!ing.data) return json({ error: 'Unknown ingredient' }, 400);
  if (!market.data) return json({ error: 'Unknown market' }, 400);

  const ref = await admin.rpc('reference_price', { p_ingredient: ingredientId, p_market: marketId }).maybeSingle();
  if (ref.error) return json({ error: 'Could not read the market price' }, 500);
  const reference = ref.data ? Number((ref.data as { price: number }).price) : null;
  const check = checkPrice(ing.data.unit as Unit, qty, total, reference);
  const unitPrice = Math.round(check.unitPrice * 100) / 100;

  const price = await admin
    .from('prices')
    .insert({
      ingredient_id: ingredientId,
      market_id: marketId,
      price: unitPrice,
      observed_at: manilaDate(loggedAt),
      source_tier: 'user_log',
      reported_by: userId,
      status: check.status,
    })
    .select('id')
    .single();
  if (price.error) return json({ error: 'Could not save the price' }, 500);

  const log = await admin.from('purchase_logs').insert({
    id,
    user_id: userId,
    ingredient_id: ingredientId,
    qty,
    total_price: total,
    unit_price: check.unitPrice,
    market_id: marketId,
    logged_at: loggedAt.toISOString(),
    status: check.status,
    price_id: price.data.id,
  });
  if (log.error) {
    await admin.from('prices').delete().eq('id', price.data.id);
    return json({ error: 'Could not save the purchase' }, 500);
  }

  return json({ id, status: check.status, unit_price: unitPrice, reference });
});
