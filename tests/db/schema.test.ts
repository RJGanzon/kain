import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, anon, removeUser, testUser, type Client } from './local';

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe('reference data is readable by everyone', () => {
  it('guests read markets, ingredients, recipes and current prices', async () => {
    const db = anon();
    const [m, i, r, ri, cp] = await Promise.all([
      db.from('markets').select('*'),
      db.from('ingredients').select('id'),
      db.from('recipes').select('id'),
      db.from('recipe_items').select('recipe_id'),
      db.from('current_prices').select('*').eq('market_id', 'pampang'),
    ]);
    expect(m.data).toHaveLength(3);
    expect(i.data!.length).toBe(36);
    expect(r.data!.length).toBe(22);
    expect(ri.data!.length).toBeGreaterThan(100);
    expect(cp.data).toHaveLength(36);
    const kamatis = cp.data!.find((p) => p.ingredient_id === 'kamatis')!;
    expect(kamatis).toMatchObject({ price: 120, source_tier: 'estimate', prev_price: 85 });
  });

  it('guests never see who reported a price, flagged prices, or user data', async () => {
    const db = anon();
    const who = await db.from('prices').select('reported_by').limit(1);
    expect(who.error?.message).toMatch(/permission denied/);
    const flagged = await db.from('prices').select('id').eq('status', 'flagged');
    expect(flagged.data ?? []).toHaveLength(0);
    for (const table of ['profiles', 'purchase_logs', 'eatery_menu', 'pots', 'pot_sales', 'family_settings'] as const) {
      const res = await db.from(table).select('*').limit(1);
      expect(res.data ?? [], table).toHaveLength(0);
    }
  });

  it('nobody inserts prices directly', async () => {
    const res = await anon().from('prices').insert({ ingredient_id: 'kamatis', price: 1, observed_at: today, source_tier: 'contributor' });
    expect(res.error).not.toBeNull();
  });
});

describe('current prices fall back down the tiers', () => {
  const inserted: string[] = [];
  afterAll(async () => {
    if (inserted.length) await admin().from('prices').delete().in('id', inserted);
  });

  it('a recent contributor price at one market beats the regional estimate there only', async () => {
    const svc = admin();
    const add = async (row: Parameters<ReturnType<typeof admin>['from']>[0] extends never ? never : Record<string, unknown>) => {
      const { data, error } = await svc.from('prices').insert(row as never).select('id').single();
      if (error) throw error;
      inserted.push(data.id);
    };
    await add({ ingredient_id: 'talong', market_id: 'pampang', price: 99, observed_at: today, source_tier: 'contributor' });
    await add({ ingredient_id: 'talong', market_id: 'pampang', price: 500, observed_at: today, source_tier: 'contributor', status: 'flagged' });
    await add({ ingredient_id: 'okra', market_id: null, price: 77, observed_at: daysAgo(2), source_tier: 'da_avg' });
    await add({ ingredient_id: 'okra', market_id: 'anunas', price: 81, observed_at: daysAgo(30), source_tier: 'contributor' });

    const cp = await anon().from('current_prices').select('*').in('ingredient_id', ['talong', 'okra']);
    const at = (ing: string, m: string) => cp.data!.find((p) => p.ingredient_id === ing && p.market_id === m)!;
    expect(at('talong', 'pampang')).toMatchObject({ price: 99, source_tier: 'contributor' });
    expect(at('talong', 'anunas')).toMatchObject({ price: 90, source_tier: 'estimate' });
    // DA average (tier 3, recent) beats the estimate (tier 4)…
    expect(at('okra', 'pampang')).toMatchObject({ price: 77, source_tier: 'da_avg' });
    // …and an old contributor price (over 14 days) doesn't count.
    expect(at('okra', 'anunas')).toMatchObject({ price: 77, source_tier: 'da_avg' });
  });
});

describe('user data belongs to its owner', () => {
  let a: { client: Client; id: string };
  let b: { client: Client; id: string };
  beforeAll(async () => {
    [a, b] = await Promise.all([testUser('a'), testUser('b')]);
  });
  afterAll(async () => {
    await Promise.all([removeUser(a.id), removeUser(b.id)]);
  });

  it('every new account gets a profile named from the provider, with no role yet', async () => {
    const { data } = await a.client.from('profiles').select('*').single();
    expect(data).toMatchObject({ id: a.id, display_name: 'Test a', role: null, plan: 'free', market_id: 'pampang' });
  });

  it('people set their role and market but never their own plan', async () => {
    const ok = await a.client.from('profiles').update({ role: 'eatery', market_id: 'anunas' }).eq('id', a.id).select().single();
    expect(ok.data).toMatchObject({ role: 'eatery', market_id: 'anunas' });
    const sneaky = await a.client.from('profiles').update({ plan: 'business' } as never).eq('id', a.id);
    expect(sneaky.error?.message).toMatch(/permission denied/);
    const other = await b.client.from('profiles').update({ role: 'family' }).eq('id', a.id).select();
    expect(other.data ?? []).toHaveLength(0);
  });

  it('the free plan costs up to 3 dishes; the demo activation lifts the limit', async () => {
    for (const recipe_id of ['munggo', 'amanok', 'pinakbet']) {
      const res = await a.client.from('eatery_menu').insert({ recipe_id, price: 50, order_g: 180 });
      expect(res.error).toBeNull();
    }
    const fourth = await a.client.from('eatery_menu').insert({ recipe_id: 'sinigang', price: 90, order_g: 250 });
    expect(fourth.error?.message).toMatch(/free plan covers 3 dishes/i);
    const plan = await a.client.rpc('activate_business_demo');
    expect(plan.data).toBe('business');
    const again = await a.client.from('eatery_menu').insert({ recipe_id: 'sinigang', price: 90, order_g: 250 });
    expect(again.error).toBeNull();
  });

  it('pots and sales stay private, and a sale must belong to its pot owner', async () => {
    const dish = await a.client.from('eatery_menu').select('id').eq('recipe_id', 'amanok').single();
    const pot = await a.client.from('pots').insert({ menu_item_id: dish.data!.id, cooked_kg: 4 }).select().single();
    expect(pot.error).toBeNull();
    const sale = await a.client.from('pot_sales').insert({ pot_id: pot.data!.id, orders: 5 });
    expect(sale.error).toBeNull();

    expect((await b.client.from('pots').select('*')).data).toHaveLength(0);
    expect((await b.client.from('pot_sales').select('*')).data).toHaveLength(0);
    const theft = await b.client.from('pot_sales').insert({ pot_id: pot.data!.id, orders: 1 });
    expect(theft.error).not.toBeNull();
  });

  it('family settings are saved per person', async () => {
    const up = await a.client.from('family_settings').upsert({ user_id: a.id, budget_per_day: 350, adults: 2, kids: 3, days: 7 });
    expect(up.error).toBeNull();
    expect((await b.client.from('family_settings').select('*')).data).toHaveLength(0);
    const bad = await b.client.from('family_settings').insert({ user_id: a.id, budget_per_day: 350, adults: 2, kids: 3, days: 7 });
    expect(bad.error).not.toBeNull();
  });
});
