import { describe, expect, it } from 'vitest';
import { checkPrice, toPriceUnits } from './price-check';

describe('logged price check (±30%)', () => {
  it('turns grams, ml and counts into price units', () => {
    expect(toPriceUnits('kg', 500)).toBe(0.5);
    expect(toPriceUnits('L', 250)).toBe(0.25);
    expect(toPriceUnits('pc', 12)).toBe(12);
  });

  it('accepts a price within 30% of the market price', () => {
    expect(checkPrice('kg', 1000, 110, 120)).toMatchObject({ unitPrice: 110, status: 'accepted' });
    expect(checkPrice('kg', 1000, 156, 120).status).toBe('accepted'); // exactly +30%
    expect(checkPrice('kg', 1000, 84, 120).status).toBe('accepted'); // exactly −30%
  });

  it('flags a price further away, or one with nothing to compare to', () => {
    expect(checkPrice('kg', 1000, 157, 120).status).toBe('flagged');
    expect(checkPrice('kg', 1000, 83, 120).status).toBe('flagged');
    expect(checkPrice('pc', 12, 300, 8.5).status).toBe('flagged');
    expect(checkPrice('kg', 1000, 110, null)).toMatchObject({ ratio: null, status: 'flagged' });
  });
});
