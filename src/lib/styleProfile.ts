import { supabaseAdmin } from './supabase';

export async function getStyleProfile(): Promise<string> {
  const { data: suggestions } = await supabaseAdmin
    .from('outfit_suggestions')
    .select('item_ids, outcome')
    .not('outcome', 'is', null);

  if (!suggestions || suggestions.length === 0) return '';

  const wornCounts: Record<string, number> = {};
  const skippedCounts: Record<string, number> = {};

  for (const s of suggestions) {
    const ids: string[] = s.item_ids ?? [];
    if (s.outcome === 'worn') {
      ids.forEach(id => { wornCounts[id] = (wornCounts[id] ?? 0) + 1; });
    } else if (s.outcome === 'skipped') {
      ids.forEach(id => { skippedCounts[id] = (skippedCounts[id] ?? 0) + 1; });
    }
  }

  // Preferred: worn more than skipped
  // Avoided: skipped more than worn (and skipped at least twice to reduce noise)
  const preferredIds = Object.keys(wornCounts).filter(
    id => (wornCounts[id] ?? 0) > (skippedCounts[id] ?? 0)
  );
  const avoidedIds = Object.keys(skippedCounts).filter(
    id => (skippedCounts[id] ?? 0) >= 2 && (skippedCounts[id] ?? 0) > (wornCounts[id] ?? 0)
  );

  if (preferredIds.length === 0 && avoidedIds.length === 0) return '';

  const allIds = [...new Set([...preferredIds, ...avoidedIds])];
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, name')
    .in('id', allIds);

  if (!items) return '';

  const nameOf = (id: string) => items.find(i => i.id === id)?.name ?? id;

  const lines: string[] = ['STYLE HISTORY (learned from Talal\'s actual outfit choices):'];
  if (preferredIds.length > 0) {
    lines.push(`Reaches for these: ${preferredIds.map(nameOf).join(', ')}`);
  }
  if (avoidedIds.length > 0) {
    lines.push(`Consistently skips these: ${avoidedIds.map(nameOf).join(', ')}`);
  }
  lines.push('Prioritise what he actually wears. Don\'t keep suggesting things he skips.');

  return lines.join('\n');
}
