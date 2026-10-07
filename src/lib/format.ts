const MINUS = '−';

/** ₱1,234 (whole pesos). Negative values use a true minus sign: −₱70. */
export function peso(value: number): string {
  const sign = value < 0 ? MINUS : '';
  return sign + '₱' + Math.round(Math.abs(value)).toLocaleString('en-PH');
}

/** ₱33.17 (two decimals). */
export function peso2(value: number): string {
  const sign = value < 0 ? MINUS : '';
  return (
    sign +
    '₱' +
    Math.abs(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** 4.0 (kilograms, one decimal). */
export function kg(value: number): string {
  return value.toFixed(1);
}

/** 83% */
export function pct(ratio: number): string {
  return Math.round(ratio * 100) + '%';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
