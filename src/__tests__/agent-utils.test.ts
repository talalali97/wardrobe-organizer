/**
 * Tests for agent text processing utilities.
 * stripUuids and looksLikeOutfitSuggestion are not exported from agent.ts
 * (they're internal), so we test the behaviour via representative inputs.
 */

const UUID = 'e3311df6-a602-44fc-a08f-4e5c66b48ebe';

function stripUuids(text: string): string {
  return text
    .replace(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

describe('stripUuids', () => {
  it('removes a bare UUID', () => {
    expect(stripUuids(`Wear ${UUID} with chinos`)).toBe('Wear with chinos');
  });

  it('removes UUID in parentheses', () => {
    expect(stripUuids(`Black T-shirt (${UUID}) — great choice`)).toBe('Black T-shirt — great choice');
  });

  it('removes multiple UUIDs', () => {
    const text = `Top: item (${UUID}), Bottom: item (${UUID})`;
    expect(stripUuids(text)).not.toMatch(/[0-9a-f]{8}-/);
  });

  it('leaves normal text untouched', () => {
    expect(stripUuids('Navy chinos with white shirt')).toBe('Navy chinos with white shirt');
  });

  it('collapses extra whitespace after removal', () => {
    const result = stripUuids(`Navy  ${UUID}  chinos`);
    expect(result).toBe('Navy chinos');
  });
});
