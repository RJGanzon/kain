import type { Ingredient, Unit } from '@/lib/data/types';

/**
 * Purchase log parser (KAIN_BUILD_PROMPT §7.2), ported from
 * reference/mvp/app.js. Filipino or English, typed or spoken:
 *   "isang dosenang itlog 102"        → itlog, 12 pc, ₱102 (₱8.50/pc)
 *   "kalahating kilo galunggong 140"  → 500 g, ₱280/kg
 *   "₱95 1 kilo talong", "kamatis 110" (1 kg when no amount is said)
 */

const NUMBER_WORDS: Record<string, number> = {
  isa: 1,
  isang: 1,
  dalawa: 2,
  dalawang: 2,
  tatlo: 3,
  tatlong: 3,
  apat: 4,
  lima: 5,
  limang: 5,
  anim: 6,
  kalahati: 0.5,
  kalahating: 0.5,
  one: 1,
  two: 2,
  three: 3,
  half: 0.5,
};

type SaidUnit = 'kg' | 'g' | 'pc' | 'bundle' | 'can' | 'pack' | 'ml';

const UNITS: Array<[RegExp, SaidUnit, number]> = [
  [/^(kilos?|kg|kgs|k)$/, 'kg', 1000],
  [/^(gramo|grams?|g)$/, 'g', 1],
  [/^(piraso|pirasong|pcs?|pieces?|piece)$/, 'pc', 1],
  [/^(dosena|dosenang|dozen|doz)$/, 'pc', 12],
  [/^(tali|bugkos|bundles?)$/, 'bundle', 1],
  [/^(lata|cans?)$/, 'can', 1],
  [/^(packs?|pakete|sachets?)$/, 'pack', 1],
  [/^(litro|liters?|litres?|l)$/, 'ml', 1000],
  [/^(ml)$/, 'ml', 1],
];

export type ParseError = 'no-item' | 'no-price' | 'unit-mismatch';

export type ParseResult =
  | {
      ok: true;
      ingredient: Ingredient;
      /** In the ingredient's own measure: grams (kg items), ml (L items) or a count. */
      qty: number;
      /** In price units: kg, L, or pieces/tali/cans/packs. */
      unitQty: number;
      /** What was paid. */
      price: number;
      /** Per kg, L or unit. */
      unitPrice: number;
    }
  | { ok: false; error: ParseError; message: string; ingredient?: Ingredient };

const UNIT_WORD: Record<Unit, string> = { kg: 'kilo', L: 'L', pc: 'pc', bundle: 'tali', can: 'can', pack: 'pack' };

function normalize(text: string): string {
  return (
    ' ' +
    text
      .toLowerCase()
      .replace(/₱|php|pesos?|piso/g, ' ₱ ')
      .replace(/,/g, '')
      // "250g", "2kilo", "1/2kilo" → "250 g", "2 kilo", "1/2 kilo"
      .replace(/(\d)([a-z])/g, '$1 $2')
      .replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/[.!?]+(\s|$)/g, ' ')
      .replace(/\s+/g, ' ') +
    ' '
  );
}

export function parseLog(text: string, ingredients: Ingredient[]): ParseResult {
  const t = normalize(text);

  // The item: the longest alias said (its own name counts too: "atay ng manok").
  let item: Ingredient | undefined;
  let best = 0;
  let itemAt = -1;
  for (const ing of ingredients)
    for (const alias of [...ing.aliases, ing.name.replace(/ \(.*\)/, '').toLowerCase()]) {
      const at = t.includes(` ${alias} `) ? t.indexOf(` ${alias} `) : t.indexOf(` ${alias}s `);
      if (at >= 0 && alias.length > best) {
        best = alias.length;
        item = ing;
        itemAt = at;
      }
    }

  const toks = t.trim().split(' ');
  const nums: Array<{ v: number; i: number; word?: boolean }> = [];
  toks.forEach((w, i) => {
    if (/^\d+(\.\d+)?$/.test(w)) nums.push({ v: parseFloat(w), i });
    else if (/^\d+\/\d+$/.test(w)) {
      const [a, b] = w.split('/').map(Number);
      if (b) nums.push({ v: a / b, i });
    } else if (NUMBER_WORDS[w] !== undefined) nums.push({ v: NUMBER_WORDS[w], i, word: true });
  });

  let unit: SaidUnit | null = null;
  let mult = 1;
  let unitIdx = -1;
  for (let i = 0; i < toks.length && !unit; i++)
    for (const [re, u, m] of UNITS)
      if (re.test(toks[i])) {
        unit = u;
        mult = m;
        unitIdx = i;
        break;
      }

  let qty: number | null = null;
  let price: number | null = null;
  const pesoIdx = toks.indexOf('₱');
  if (pesoIdx >= 0) price = nums.find((n) => n.i > pesoIdx)?.v ?? null;
  const qtyCandidates = nums.filter((n) => n.v !== price || n.word);
  if (unitIdx >= 0) qty = qtyCandidates.filter((n) => n.i < unitIdx).pop()?.v ?? null;
  if (price === null) {
    const rest = nums.filter((n) => !(qty !== null && n.v === qty && n.i < unitIdx));
    price = rest.filter((n) => !n.word).pop()?.v ?? null;
  }
  // Counted items need no unit word: "anim na itlog 51" is 6 eggs.
  if (qty === null && unitIdx < 0 && item && item.unit !== 'kg' && item.unit !== 'L' && itemAt >= 0) {
    const itemTok = t.slice(0, itemAt).trim().split(' ').filter(Boolean).length;
    qty = qtyCandidates.filter((n) => n.i < itemTok && !(n.v === price && !n.word)).pop()?.v ?? null;
    if (qty !== null && price === qty) price = nums.filter((n) => !n.word && n.i > itemTok).pop()?.v ?? null;
  }
  if (qty === null) qty = 1;

  if (!item) return { ok: false, error: 'no-item', message: 'Add the item name, like "kamatis" or "itlog".' };

  // Convert what was said into the ingredient's measure.
  const u = item.unit;
  let q: number | null = null;
  if (unit === null) q = u === 'kg' || u === 'L' ? qty * 1000 : qty;
  else if (unit === 'kg') q = u === 'kg' ? qty * 1000 : null;
  else if (unit === 'g') q = u === 'kg' ? qty : null;
  else if (unit === 'ml') q = u === 'L' ? qty * mult : null;
  else q = unit === u || (unit === 'pc' && u !== 'kg' && u !== 'L') ? qty * mult : null;

  const name = item.name.replace(/ \(.*\)/, '');
  if (q === null) {
    const example = `${u === 'kg' ? '1 kilo' : `1 ${UNIT_WORD[u]}`} ${item.aliases[0]} 100`;
    return { ok: false, error: 'unit-mismatch', ingredient: item, message: `${name} is priced per ${UNIT_WORD[u]}. Try "${example}".` };
  }
  if (price === null || price <= 0)
    return { ok: false, error: 'no-price', ingredient: item, message: `Add the amount you paid, like "${text.trim()} 120".` };
  if (q <= 0) return { ok: false, error: 'unit-mismatch', ingredient: item, message: 'Add how much you bought, like "1 kilo".' };

  const unitQty = u === 'kg' || u === 'L' ? q / 1000 : q;
  return { ok: true, ingredient: item, qty: q, unitQty, price, unitPrice: price / unitQty };
}

/** "1 kg", "500 g", "12 pcs", "2 tali", "3 cans" */
export function qtyLabel(unit: Unit, qty: number): string {
  if (unit === 'kg') return qty >= 1000 ? `${+(qty / 1000).toFixed(2)} kg` : `${Math.round(qty)} g`;
  if (unit === 'L') return qty >= 1000 ? `${+(qty / 1000).toFixed(2)} L` : `${Math.round(qty)} ml`;
  const words: Record<string, [string, string]> = { pc: ['pc', 'pcs'], bundle: ['tali', 'tali'], can: ['can', 'cans'], pack: ['pack', 'packs'] };
  const [one, many] = words[unit];
  return `${+qty.toFixed(2)} ${qty === 1 ? one : many}`;
}
