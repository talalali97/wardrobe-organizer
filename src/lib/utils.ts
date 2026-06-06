import type { Item } from './types';

export const COLOR_CSS: Record<string, string> = {
  'Black': '#09090b', 'White': '#fafafa', 'Off-white': '#f5f0e8', 'Cream': '#fffbeb',
  'Grey': '#71717a', 'Light Grey': '#a1a1aa', 'Dark Grey': '#3f3f46', 'Charcoal': '#27272a',
  'Beige': '#d4b896', 'Camel': '#c19a6b', 'Brown': '#92400e', 'Dark Brown': '#431407',
  'Navy': '#1e3a5f', 'Navy Blue': '#1e3a5f', 'Dark Blue': '#1e3a8a', 'Blue': '#3b82f6',
  'Light Blue': '#93c5fd', 'Sky Blue': '#7dd3fc',
  'Olive': '#6b7c3a', 'Olive Green': '#6b7c3a', 'Green': '#22c55e', 'Dark Green': '#15803d', 'Khaki': '#c3b091',
  'Maroon': '#7f1d1d', 'Burgundy': '#9f1239', 'Red': '#ef4444',
  'Orange': '#f97316', 'Yellow': '#eab308', 'Pink': '#ec4899', 'Purple': '#a855f7', 'Teal': '#0d9488',
};

export function colorToCss(name: string): string {
  return COLOR_CSS[name] ?? '#52525b';
}

export function getCurrentSeason(): 'Summer' | 'Winter' | 'Monsoon' {
  const month = new Date().getMonth() + 1;
  if (month >= 7 && month <= 9) return 'Monsoon';
  if (month >= 11 || month <= 2) return 'Winter';
  return 'Summer';
}

export function computeDupIds(items: Item[]): Set<string> {
  const groups: Record<string, string[]> = {};
  for (const item of items) {
    if (!item.subcategory || !item.color_primary) continue;
    const key = `${item.category}|${item.subcategory}|${item.color_primary}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item.id);
  }
  const ids = new Set<string>();
  for (const g of Object.values(groups)) {
    if (g.length >= 2) g.forEach(id => ids.add(id));
  }
  return ids;
}

export function formatValue(value: number): string | null {
  if (value <= 0) return null;
  if (value >= 1000) return `₨${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₨${value}`;
}

export function isNeedsReview(item: Pick<Item, 'subcategory' | 'color_primary' | 'pattern' | 'material_guess'>): boolean {
  const keyFields = [item.subcategory, item.color_primary, item.pattern, item.material_guess];
  return keyFields.filter(f => !f || f === 'Unknown').length >= 2;
}
