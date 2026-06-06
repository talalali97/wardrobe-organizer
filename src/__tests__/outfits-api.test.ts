/**
 * Tests for outfit library logic (pure functions, no DB calls).
 * API route integration tests require a running Supabase — tested manually.
 */

import { validateOutfitPayload, formatLastWorn } from '@/lib/outfitUtils';

describe('validateOutfitPayload', () => {
  it('accepts valid payload', () => {
    expect(validateOutfitPayload({ name: 'My outfit', item_ids: ['id1', 'id2'] })).toBe(true);
  });

  it('rejects missing name', () => {
    expect(validateOutfitPayload({ name: '', item_ids: ['id1'] })).toBe(false);
    expect(validateOutfitPayload({ name: '   ', item_ids: ['id1'] })).toBe(false);
  });

  it('rejects empty item_ids', () => {
    expect(validateOutfitPayload({ name: 'Test', item_ids: [] })).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(validateOutfitPayload({})).toBe(false);
    expect(validateOutfitPayload({ name: 'Test' })).toBe(false);
    expect(validateOutfitPayload({ item_ids: ['id1'] })).toBe(false);
  });
});

describe('formatLastWorn', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns null for null input', () => {
    expect(formatLastWorn(null)).toBeNull();
  });

  it('returns "Today" for same day', () => {
    jest.setSystemTime(new Date('2026-05-17T12:00:00Z'));
    expect(formatLastWorn('2026-05-17T08:00:00Z')).toBe('Today');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    jest.setSystemTime(new Date('2026-05-17T12:00:00Z'));
    expect(formatLastWorn('2026-05-16T12:00:00Z')).toBe('Yesterday');
  });

  it('returns "N days ago" for recent dates', () => {
    jest.setSystemTime(new Date('2026-05-17T12:00:00Z'));
    expect(formatLastWorn('2026-05-14T12:00:00Z')).toBe('3 days ago');
  });

  it('returns formatted date for old dates', () => {
    jest.setSystemTime(new Date('2026-05-17T12:00:00Z'));
    const result = formatLastWorn('2026-01-01T12:00:00Z');
    expect(result).toMatch(/Jan/);
  });
});
