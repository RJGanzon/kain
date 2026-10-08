/** Kain's data, as the app uses it. */

export type Unit = 'kg' | 'L' | 'pc' | 'bundle' | 'can' | 'pack';
export type Tier = 'contributor' | 'user_log' | 'da_market' | 'da_avg' | 'estimate';
export type Category = 'staple' | 'fish' | 'meat' | 'egg' | 'legume' | 'canned' | 'veg' | 'spice' | 'pantry';
export type MealType = 'breakfast' | 'ulam';
export type PriceStatus = 'accepted' | 'flagged';

/** Per 100 g edible portion. */
export interface Nutrients {
  kcal: number;
  protein_g: number;
  iron_mg: number;
  vita_ug: number;
  calcium_mg: number;
  vitc_mg: number;
}

export interface Market {
  id: string;
  name: string;
  city: string;
}

export interface Ingredient {
  id: string;
  name: string;
  aliases: string[];
  category: Category;
  unit: Unit;
  /** Grams in one unit (per litre for L items). */
  gramsPerUnit: number;
  /** Share of what you buy that is eaten. */
  ediblePortion: number;
  nutrients: Nutrients;
}

export interface RecipeItem {
  ingredientId: string;
  /** Grams for kg items, ml for L items, a count otherwise. Per serving. */
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealType;
  riceG: number;
  defaultPrice: number | null;
  orderG: number | null;
  items: RecipeItem[];
}

/** The price in use for one ingredient at one market. */
export interface Price {
  ingredientId: string;
  /** Per kg, L, pc, bundle, can or pack. */
  price: number;
  /** yyyy-mm-dd */
  observedAt: string;
  tier: Tier;
  /** About four weeks earlier, for change pills and spike alerts. */
  prevPrice: number | null;
  prevObservedAt: string | null;
}

export interface Catalog {
  marketId: string;
  markets: Market[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  prices: Record<string, Price>;
  substituteGroups: string[][];
  /** Prices are sample estimates, not real market prices. */
  sample: boolean;
  /** Where this catalog came from. */
  source: 'bundled' | 'server';
  /** When prices were last fetched from the server (ms), or null. */
  syncedAt: number | null;
}
