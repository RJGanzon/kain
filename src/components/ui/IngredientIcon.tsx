import { Bean, Carrot, Drumstick, Egg, Fish, Package, ShoppingBasket, Wheat, type LucideIcon } from 'lucide-react';
import type { Category } from '@/lib/data/types';
import { IconTile } from './bits';

const ICONS: Record<Category, { Icon: LucideIcon; tile: string; color: string }> = {
  veg: { Icon: Carrot, tile: 'bg-good-bg', color: 'text-good' },
  spice: { Icon: Carrot, tile: 'bg-good-bg', color: 'text-good' },
  fish: { Icon: Fish, tile: 'bg-tile-night', color: 'text-ink' },
  canned: { Icon: Package, tile: 'bg-tile-night', color: 'text-ink' },
  meat: { Icon: Drumstick, tile: 'bg-bad-bg', color: 'text-bad-icon' },
  egg: { Icon: Egg, tile: 'bg-brand-tint', color: 'text-ink' },
  staple: { Icon: Wheat, tile: 'bg-brand-tint', color: 'text-ink' },
  legume: { Icon: Bean, tile: 'bg-good-bg', color: 'text-good' },
  pantry: { Icon: ShoppingBasket, tile: 'bg-surface', color: 'text-ink' },
};

/** A 40 px tile with an icon for the ingredient's kind (fish, meat, vegetables…). */
export function IngredientIcon({ category }: { category: Category }) {
  const { Icon, tile, color } = ICONS[category];
  return (
    <IconTile size={40} radius={12} className={tile}>
      <Icon size={20} strokeWidth={2.2} className={color} />
    </IconTile>
  );
}
