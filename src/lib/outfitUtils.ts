export const OCCASIONS = ['Casual', 'Office', 'Going-out', 'Formal', 'Gym', 'Travel', 'Street'] as const;
export type Occasion = typeof OCCASIONS[number];

export interface SavedOutfit {
  id: string;
  name: string;
  item_ids: string[];
  occasion: string | null;
  notes: string;
  wear_count: number;
  last_worn: string | null;
  created_at: string;
}

export interface Capsule {
  id: string;
  name: string;
  description: string;
  item_ids: string[];
  occasion: string | null;
  created_at: string;
}

export function validateOutfitPayload(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) return false;
  if (!Array.isArray(payload.item_ids) || payload.item_ids.length === 0) return false;
  return true;
}

export function formatLastWorn(lastWorn: string | null): string | null {
  if (!lastWorn) return null;
  const now = new Date();
  const worn = new Date(lastWorn);
  const diffMs = now.getTime() - worn.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return worn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined });
}
