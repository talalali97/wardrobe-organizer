import { colorToCss, getCurrentSeason, computeDupIds, formatValue, isNeedsReview } from '@/lib/utils';
import type { Item } from '@/lib/types';

// ── colorToCss ──────────────────────────────────────────────────────────────

describe('colorToCss', () => {
  it('returns the correct hex for known colors', () => {
    expect(colorToCss('Black')).toBe('#09090b');
    expect(colorToCss('White')).toBe('#fafafa');
    expect(colorToCss('Navy')).toBe('#1e3a5f');
    expect(colorToCss('Navy Blue')).toBe('#1e3a5f');
    expect(colorToCss('Olive Green')).toBe('#6b7c3a');
  });

  it('returns fallback grey for unknown colors', () => {
    expect(colorToCss('Turquoise')).toBe('#52525b');
    expect(colorToCss('')).toBe('#52525b');
    expect(colorToCss('some random color')).toBe('#52525b');
  });
});

// ── getCurrentSeason ────────────────────────────────────────────────────────

describe('getCurrentSeason', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns Monsoon for July–September', () => {
    [7, 8, 9].forEach(m => {
      jest.setSystemTime(new Date(2026, m - 1, 15));
      expect(getCurrentSeason()).toBe('Monsoon');
    });
  });

  it('returns Winter for November, December, January, February', () => {
    [11, 12, 1, 2].forEach(m => {
      jest.setSystemTime(new Date(2026, m - 1, 15));
      expect(getCurrentSeason()).toBe('Winter');
    });
  });

  it('returns Summer for March–June and October', () => {
    [3, 4, 5, 6, 10].forEach(m => {
      jest.setSystemTime(new Date(2026, m - 1, 15));
      expect(getCurrentSeason()).toBe('Summer');
    });
  });
});

// ── computeDupIds ───────────────────────────────────────────────────────────

const baseItem = (overrides: Partial<Item>): Item => ({
  id: 'id-1',
  name: 'Test Item',
  image_url: null,
  storage_path: null,
  category: 'Top',
  subcategory: 'T-shirt',
  color_primary: 'Black',
  color_secondary: null,
  pattern: 'Solid',
  material_guess: 'Cotton',
  weight: 'Light',
  formality: 2,
  sleeve_length: 'Short',
  season_tags: ['Summer'],
  context_tags: ['Casual'],
  fit: 'Regular',
  status: 'Clean',
  price: null,
  notes: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  wear_count: 0,
  last_worn: null,
  days_since_worn: null,
  ...overrides,
});

describe('computeDupIds', () => {
  it('returns empty set when no items', () => {
    expect(computeDupIds([])).toEqual(new Set());
  });

  it('flags items with matching category + subcategory + color_primary', () => {
    const items = [
      baseItem({ id: 'a', category: 'Top', subcategory: 'T-shirt', color_primary: 'Black' }),
      baseItem({ id: 'b', category: 'Top', subcategory: 'T-shirt', color_primary: 'Black' }),
      baseItem({ id: 'c', category: 'Top', subcategory: 'Polo', color_primary: 'Black' }),
    ];
    const result = computeDupIds(items);
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
    expect(result.has('c')).toBe(false);
  });

  it('does not flag items missing subcategory or color', () => {
    const items = [
      baseItem({ id: 'a', subcategory: null, color_primary: 'Black' }),
      baseItem({ id: 'b', subcategory: null, color_primary: 'Black' }),
    ];
    expect(computeDupIds(items)).toEqual(new Set());
  });

  it('does not flag a single item in a group', () => {
    const items = [
      baseItem({ id: 'a', category: 'Top', subcategory: 'T-shirt', color_primary: 'White' }),
      baseItem({ id: 'b', category: 'Top', subcategory: 'T-shirt', color_primary: 'Black' }),
    ];
    expect(computeDupIds(items)).toEqual(new Set());
  });

  it('handles three-way duplicates', () => {
    const items = [
      baseItem({ id: 'a', category: 'Top', subcategory: 'T-shirt', color_primary: 'Navy' }),
      baseItem({ id: 'b', category: 'Top', subcategory: 'T-shirt', color_primary: 'Navy' }),
      baseItem({ id: 'c', category: 'Top', subcategory: 'T-shirt', color_primary: 'Navy' }),
    ];
    const result = computeDupIds(items);
    expect(result.size).toBe(3);
  });
});

// ── formatValue ─────────────────────────────────────────────────────────────

describe('formatValue', () => {
  it('returns null for zero or negative', () => {
    expect(formatValue(0)).toBeNull();
    expect(formatValue(-100)).toBeNull();
  });

  it('formats values under 1000 as ₨N', () => {
    expect(formatValue(500)).toBe('₨500');
    expect(formatValue(999)).toBe('₨999');
  });

  it('formats values 1000–9999 with one decimal', () => {
    expect(formatValue(1000)).toBe('₨1.0k');
    expect(formatValue(5500)).toBe('₨5.5k');
  });

  it('formats values 10000+ with no decimal', () => {
    expect(formatValue(10000)).toBe('₨10k');
    expect(formatValue(85000)).toBe('₨85k');
  });
});

// ── isNeedsReview ────────────────────────────────────────────────────────────

describe('isNeedsReview', () => {
  it('returns false when all key fields are present', () => {
    expect(isNeedsReview({ subcategory: 'T-shirt', color_primary: 'Black', pattern: 'Solid', material_guess: 'Cotton' })).toBe(false);
  });

  it('returns false when only one field is missing', () => {
    expect(isNeedsReview({ subcategory: null, color_primary: 'Black', pattern: 'Solid', material_guess: 'Cotton' })).toBe(false);
  });

  it('returns true when two or more fields are missing', () => {
    expect(isNeedsReview({ subcategory: null, color_primary: null, pattern: 'Solid', material_guess: 'Cotton' })).toBe(true);
    expect(isNeedsReview({ subcategory: null, color_primary: null, pattern: null, material_guess: null })).toBe(true);
  });

  it('treats Unknown as missing', () => {
    expect(isNeedsReview({ subcategory: 'T-shirt', color_primary: 'Black', pattern: 'Solid', material_guess: 'Unknown' })).toBe(false);
    expect(isNeedsReview({ subcategory: 'T-shirt', color_primary: 'Black', pattern: 'Unknown', material_guess: 'Unknown' })).toBe(true);
  });
});
