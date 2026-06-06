import { itemsToCsv } from '@/lib/image';

const mockItem = {
  id: 'abc-123',
  name: 'Black T-shirt',
  category: 'Top',
  subcategory: 'T-shirt',
  color_primary: 'Black',
  color_secondary: null,
  pattern: 'Solid',
  material_guess: 'Cotton',
  weight: 'Light',
  formality: 2,
  sleeve_length: 'Short',
  season_tags: ['Summer', 'All-year'],
  context_tags: ['Casual', 'Home'],
  fit: 'Regular',
  status: 'Clean',
  price: 1500,
  notes: '',
  image_url: 'https://example.com/img.jpg',
  created_at: '2026-01-01T00:00:00Z',
};

describe('itemsToCsv', () => {
  it('produces a header row', () => {
    const csv = itemsToCsv([]);
    expect(csv.split('\n')[0]).toContain('id');
    expect(csv.split('\n')[0]).toContain('name');
    expect(csv.split('\n')[0]).toContain('price');
  });

  it('produces one data row per item', () => {
    const csv = itemsToCsv([mockItem, mockItem]);
    expect(csv.split('\n').length).toBe(3); // header + 2 rows
  });

  it('includes item name in output', () => {
    const csv = itemsToCsv([mockItem]);
    expect(csv).toContain('Black T-shirt');
  });

  it('joins array fields with pipe separator', () => {
    const csv = itemsToCsv([mockItem]);
    expect(csv).toContain('Summer|All-year');
    expect(csv).toContain('Casual|Home');
  });

  it('handles null fields gracefully', () => {
    const item = { ...mockItem, color_secondary: null, price: null, notes: '' };
    expect(() => itemsToCsv([item])).not.toThrow();
  });

  it('quotes fields containing commas', () => {
    const item = { ...mockItem, name: 'Shirt, White' };
    const csv = itemsToCsv([item]);
    expect(csv).toContain('"Shirt, White"');
  });
});
