import Dexie, { type Table } from 'dexie';
import type { Ingredient, Market, Price, PriceStatus, Recipe } from './types';

/**
 * Kain's on-device database (IndexedDB). It holds the price catalog for the
 * chosen market, so planning works offline, and everything a person records
 * (purchase logs, eatery menu, pots, sales). Writes for the server wait in
 * `outbox` until the phone is online and signed in.
 */

export interface CachedPrice extends Price {
  marketId: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface PurchaseLog {
  id: string;
  ingredientId: string;
  /** In the ingredient's unit: grams (kg items), ml (L items), or a count. */
  qty: number;
  totalPrice: number;
  /** Per kg, L or unit. */
  unitPrice: number;
  /** The market price it was checked against. */
  refPrice: number | null;
  marketId: string;
  loggedAt: number;
  status: PriceStatus;
  text: string;
}

export interface MenuItem {
  id: string;
  recipeId: string;
  price: number;
  orderG: number;
  latePrice: number | null;
  extras: number;
  position: number;
  createdAt: number;
}

export interface Pot {
  id: string;
  menuItemId: string;
  /** yyyy-mm-dd (Philippine time) */
  date: string;
  cookedKg: number;
  cookedAt: number;
}

export interface PotSale {
  id: string;
  potId: string;
  /** +n sold, −1 undo, or a correction from weighing the pot. */
  orders: number;
  createdAt: number;
}

export type OutboxKind = 'log' | 'family' | 'profile' | 'menu' | 'menu-delete' | 'pot' | 'pot-delete' | 'sale';

export interface OutboxItem {
  seq?: number;
  kind: OutboxKind;
  /** Row id, so a later write to the same row can replace an earlier one. */
  key: string;
  payload: unknown;
  createdAt: number;
  tries: number;
}

class KainDB extends Dexie {
  meta!: Table<MetaRow, string>;
  markets!: Table<Market, string>;
  ingredients!: Table<Ingredient, string>;
  recipes!: Table<Recipe, string>;
  prices!: Table<CachedPrice, [string, string]>;
  logs!: Table<PurchaseLog, string>;
  menu!: Table<MenuItem, string>;
  pots!: Table<Pot, string>;
  sales!: Table<PotSale, string>;
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super('kain');
    this.version(1).stores({
      meta: 'key',
      markets: 'id',
      ingredients: 'id',
      recipes: 'id',
      prices: '[marketId+ingredientId], marketId',
      logs: 'id, loggedAt, ingredientId',
      menu: 'id, position, recipeId',
      pots: 'id, date, menuItemId',
      sales: 'id, potId, createdAt',
      outbox: '++seq, kind, key',
    });
  }
}

let instance: KainDB | null = null;

/** The database, or null where IndexedDB isn't available (server render, some private modes). */
export function db(): KainDB | null {
  if (typeof indexedDB === 'undefined') return null;
  instance ??= new KainDB();
  return instance;
}

export function newId(): string {
  return crypto.randomUUID();
}
