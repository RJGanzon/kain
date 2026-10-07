import type { Category, Ingredient, Recipe } from '@/lib/data/types';

/** Words for showing a plan. */

const SEASONING = new Set(['mantika', 'toyo', 'suka', 'patis', 'bawang', 'sibuyas']);

export function shortName(name: string): string {
  return name.replace(/ \(.*\)/, '');
}

/** "Sardinas, itlog, kamatis · with rice" — main ingredients, seasonings left out. */
export function mealIngredients(recipe: Recipe, ingredients: Map<string, Ingredient>): string {
  const names = recipe.items
    .filter((it) => !SEASONING.has(it.ingredientId))
    .slice(0, 4)
    .map((it) => shortName(ingredients.get(it.ingredientId)?.name ?? it.ingredientId).toLowerCase());
  const text = names.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1) + (recipe.riceG > 0 ? ' · with rice' : '');
}

export const CATEGORY_LABEL: Record<Category, string> = {
  staple: 'Rice and bread',
  fish: 'Fish',
  meat: 'Meat',
  egg: 'Eggs',
  legume: 'Beans and tofu',
  canned: 'Canned',
  veg: 'Vegetables',
  spice: 'Aromatics',
  pantry: 'Pantry',
};

export const CATEGORY_ORDER: Category[] = ['staple', 'fish', 'meat', 'egg', 'legume', 'canned', 'veg', 'spice', 'pantry'];

const TZ = 'Asia/Manila';

// Formatters are slow to create on a low-end phone: make each one once.
let longFmt: Intl.DateTimeFormat | null = null;
let weekdayShort: Intl.DateTimeFormat | null = null;
let weekdayLong: Intl.DateTimeFormat | null = null;

/** "Thursday, October 8" (Philippine time). */
export function longDate(d: Date = new Date()): string {
  longFmt ??= new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ });
  return longFmt.format(d);
}

/** Day labels for a plan starting today: [{ short: 'Thu', long: 'Thursday' }, …]. */
export function planWeekdays(count: number, start: Date = new Date()): Array<{ short: string; long: string }> {
  weekdayShort ??= new Intl.DateTimeFormat('en-PH', { weekday: 'short', timeZone: TZ });
  weekdayLong ??= new Intl.DateTimeFormat('en-PH', { weekday: 'long', timeZone: TZ });
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000);
    return { short: weekdayShort!.format(d), long: weekdayLong!.format(d) };
  });
}

/** "2 adults · 3 kids", "1 adult". */
export function familyLabel(adults: number, kids: number): string {
  const a = `${adults} ${adults === 1 ? 'adult' : 'adults'}`;
  return kids > 0 ? `${a} · ${kids} ${kids === 1 ? 'kid' : 'kids'}` : a;
}

/** 3.8 → "3.8"; 2 → "2" */
export function servingsLabel(servings: number): string {
  return Number.isInteger(servings) ? String(servings) : servings.toFixed(1);
}
