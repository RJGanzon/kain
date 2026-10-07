import { describe, expect, it } from 'vitest';
import { bundledCatalog } from '@/lib/data/seed';
import { parseLog, qtyLabel } from './parse';

const ingredients = bundledCatalog().ingredients;
const parse = (t: string) => parseLog(t, ingredients);

function ok(t: string) {
  const r = parse(t);
  if (!r.ok) throw new Error(`${t}: ${r.message}`);
  return r;
}

describe('purchase log parser (§7.2 examples)', () => {
  it('"isang dosenang itlog 102" → itlog, 12 pc, ₱102, ₱8.50/pc', () => {
    const r = ok('isang dosenang itlog 102');
    expect(r.ingredient.id).toBe('itlog');
    expect(r.qty).toBe(12);
    expect(r.price).toBe(102);
    expect(r.unitPrice).toBeCloseTo(8.5);
  });

  it('"kalahating kilo galunggong 140" → 500 g, ₱280/kg', () => {
    const r = ok('kalahating kilo galunggong 140');
    expect(r.ingredient.id).toBe('galunggong');
    expect(r.qty).toBe(500);
    expect(r.unitPrice).toBeCloseTo(280);
  });

  it('"3 lata sardinas 78" → 3 cans, ₱26/can', () => {
    const r = ok('3 lata sardinas 78');
    expect([r.ingredient.id, r.qty, r.price]).toEqual(['sardinas', 3, 78]);
    expect(r.unitPrice).toBeCloseTo(26);
  });

  it('"2 tali kangkong 40" → 2 tali, ₱20/tali', () => {
    const r = ok('2 tali kangkong 40');
    expect([r.ingredient.id, r.qty]).toEqual(['kangkong', 2]);
    expect(r.unitPrice).toBeCloseTo(20);
  });

  it('"250 g bawang 35" → 250 g, ₱140/kg', () => {
    const r = ok('250 g bawang 35');
    expect([r.ingredient.id, r.qty]).toEqual(['bawang', 250]);
    expect(r.unitPrice).toBeCloseTo(140);
  });

  it('"₱95 1 kilo talong" → the price after ₱, 1 kg', () => {
    const r = ok('₱95 1 kilo talong');
    expect([r.ingredient.id, r.qty, r.price]).toEqual(['talong', 1000, 95]);
  });

  it('"kamatis 110" → 1 kg when no amount is said', () => {
    const r = ok('kamatis 110');
    expect([r.ingredient.id, r.qty, r.price, r.unitPrice]).toEqual(['kamatis', 1000, 110, 110]);
  });
});

describe('number words and fractions', () => {
  it.each([
    ['dalawang kilo bigas 100', 2000, 50],
    ['tatlong lata sardinas 78', 3, 26],
    ['apat na tali kangkong 80', 4, 20],
    ['limang piraso pandesal 25', 5, 5],
    ['anim na itlog 51', 6, 8.5],
    ['1/2 kilo baboy 180', 500, 360],
    ['1/4 kilo luya 40', 250, 160],
    ['isang kilo kamatis 110', 1000, 110],
  ])('%s', (text, qty, unitPrice) => {
    const r = ok(text);
    expect(r.qty).toBe(qty);
    expect(r.unitPrice).toBeCloseTo(unitPrice);
  });
});

describe('units and prices', () => {
  it('litres and ml for oil, toyo, suka, patis', () => {
    expect(ok('1 litro mantika 95').qty).toBe(1000);
    expect(ok('250 ml toyo 12').unitPrice).toBeCloseTo(48);
  });

  it('takes the price after ₱, php or pesos, else the last number that isn’t the amount', () => {
    expect(ok('2 kilo kamatis php 220').price).toBe(220);
    expect(ok('2 kilo kamatis 220 pesos').price).toBe(220);
    expect(ok('isang kilo kamatis, 110').price).toBe(110);
  });

  it('copes with speech-to-text and quick typing', () => {
    expect(ok('Isang kilo Kamatis 110.').qty).toBe(1000);
    expect(ok('250g bawang 35').qty).toBe(250);
    expect(ok('isang kilo tomatoes 110').ingredient.id).toBe('kamatis');
  });

  it('matches the longest alias', () => {
    expect(ok('1 kilo atay ng manok 170').ingredient.id).toBe('atay');
    expect(ok('isang kilo chicken liver 170').ingredient.id).toBe('atay');
  });
});

describe('clear messages when something is missing', () => {
  it('no item', () => {
    const r = parse('isang kilo 110');
    expect(r).toMatchObject({ ok: false, error: 'no-item', message: 'Add the item name, like "kamatis" or "itlog".' });
  });

  it('no price', () => {
    const r = parse('isang kilo kamatis');
    expect(r).toMatchObject({ ok: false, error: 'no-price' });
    expect(!r.ok && r.message).toMatch(/Add the amount you paid/);
  });

  it('unit mismatch', () => {
    expect(parse('1 kilo itlog 100')).toMatchObject({ ok: false, error: 'unit-mismatch', message: 'Itlog is priced per pc. Try "1 pc itlog 100".' });
    expect(parse('3 lata kamatis 50')).toMatchObject({ ok: false, error: 'unit-mismatch', message: 'Kamatis is priced per kilo. Try "1 kilo kamatis 100".' });
  });
});

describe('quantity labels', () => {
  it.each([
    ['kg', 1000, '1 kg'],
    ['kg', 500, '500 g'],
    ['kg', 1250, '1.25 kg'],
    ['L', 250, '250 ml'],
    ['pc', 12, '12 pcs'],
    ['pc', 1, '1 pc'],
    ['bundle', 2, '2 tali'],
    ['can', 3, '3 cans'],
  ] as const)('%s %s → %s', (unit, qty, label) => {
    expect(qtyLabel(unit, qty)).toBe(label);
  });
});
