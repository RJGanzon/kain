import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, anon, LOCAL_ANON, LOCAL_URL, removeUser, testUser } from './local';

/** The log-purchase Edge Function (needs `supabase functions serve`). */

const FN = `${LOCAL_URL}/functions/v1/log-purchase`;

async function call(token: string, body: Record<string, unknown>) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: LOCAL_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function currentPrice(ingredient: string, market: string) {
  const { data } = await anon().from('current_prices').select('price, source_tier').eq('ingredient_id', ingredient).eq('market_id', market).single();
  return data!;
}

describe('log-purchase', () => {
  let user: Awaited<ReturnType<typeof testUser>>;
  let other: Awaited<ReturnType<typeof testUser>>;
  beforeAll(async () => {
    [user, other] = await Promise.all([testUser('logger'), testUser('other')]);
  });
  afterAll(async () => {
    const svc = admin();
    await svc.from('prices').delete().in('reported_by', [user.id, other.id]);
    await Promise.all([removeUser(user.id), removeUser(other.id)]);
  });

  it('turns away guests and bad input', async () => {
    expect((await call(LOCAL_ANON, { id: crypto.randomUUID() })).status).toBe(401);
    const base = { id: crypto.randomUUID(), ingredient_id: 'kamatis', qty: 1000, total_price: 110, market_id: 'pampang' };
    expect((await call(user.token, { ...base, id: 'nope' })).status).toBe(400);
    expect((await call(user.token, { ...base, qty: 0 })).status).toBe(400);
    expect((await call(user.token, { ...base, total_price: -5 })).status).toBe(400);
    expect((await call(user.token, { ...base, ingredient_id: 'unicorn' })).status).toBe(400);
    expect((await call(user.token, { ...base, market_id: 'mars' })).status).toBe(400);
  });

  it('accepts a price close to the market and it becomes the market price there', async () => {
    const before = await currentPrice('sitaw', 'san-nicolas');
    expect(before).toMatchObject({ price: 100, source_tier: 'estimate' });
    const id = crypto.randomUUID();
    const res = await call(user.token, { id, ingredient_id: 'sitaw', qty: 500, total_price: 55, market_id: 'san-nicolas' });
    expect(res).toMatchObject({ status: 200, body: { status: 'accepted', unit_price: 110, reference: 100 } });
    expect(await currentPrice('sitaw', 'san-nicolas')).toMatchObject({ price: 110, source_tier: 'user_log' });
    // Other markets keep their own price.
    expect(await currentPrice('sitaw', 'anunas')).toMatchObject({ price: 100, source_tier: 'estimate' });
    // The person sees their log; nobody else does.
    const mine = await user.client.from('purchase_logs').select('id, status, qty, total_price').eq('id', id).single();
    expect(mine.data).toMatchObject({ status: 'accepted', qty: 500, total_price: 55 });
    expect((await other.client.from('purchase_logs').select('id').eq('id', id)).data).toHaveLength(0);
  });

  it('saves an unusual price but flags it, and never uses it', async () => {
    const res = await call(user.token, { id: crypto.randomUUID(), ingredient_id: 'okra', qty: 1000, total_price: 500, market_id: 'anunas' });
    expect(res.body).toMatchObject({ status: 'flagged', unit_price: 500 });
    expect(await currentPrice('okra', 'anunas')).not.toMatchObject({ price: 500 });
  });

  it('checks against the market, not against other people’s logs', async () => {
    // A first log moves pechay at Pampang from the ₱80 estimate to ₱100 (within 30%).
    const first = await call(other.token, { id: crypto.randomUUID(), ingredient_id: 'pechay', qty: 1000, total_price: 100, market_id: 'pampang' });
    expect(first.body).toMatchObject({ status: 'accepted' });
    expect(await currentPrice('pechay', 'pampang')).toMatchObject({ price: 100, source_tier: 'user_log' });
    // ₱130 is +30% of ₱100 but +62% of the real ₱80 market price: flagged.
    const second = await call(user.token, { id: crypto.randomUUID(), ingredient_id: 'pechay', qty: 1000, total_price: 130, market_id: 'pampang' });
    expect(second.body).toMatchObject({ status: 'flagged', reference: 80 });
  });

  it('a retried upload logs once', async () => {
    const id = crypto.randomUUID();
    const body = { id, ingredient_id: 'itlog', qty: 12, total_price: 102, market_id: 'pampang' };
    const a = await call(user.token, body);
    const b = await call(user.token, body);
    expect(a.body).toMatchObject({ status: 'accepted', unit_price: 8.5 });
    expect(b.body).toMatchObject({ status: 'accepted', duplicate: true });
    const rows = await user.client.from('purchase_logs').select('id').eq('id', id);
    expect(rows.data).toHaveLength(1);
    // Someone else can't reuse the id.
    expect((await call(other.token, body)).status).toBe(409);
  });
});
