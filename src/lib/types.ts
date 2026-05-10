export const CATEGORIES = ['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessory', 'Underlayer'] as const;

export const SUBCATEGORIES: Record<string, readonly string[]> = {
  Top:        ['T-shirt', 'Polo', 'Shirt', 'Henley', 'Hoodie', 'Sweatshirt', 'Tank Top', 'Kameez', 'Kurta', 'Sweater'],
  Bottom:     ['Jeans', 'Chinos', 'Trousers', 'Shorts', 'Wide-leg Trousers', 'Track Pants', 'Joggers', 'Cargo Pants', 'Sweatpants', 'Shalwar'],
  Outerwear:  ['Jacket', 'Blazer', 'Coat', 'Windbreaker', 'Hoodie', 'Gilet'],
  Shoes:      ['Sneakers', 'Loafers', 'Dress Shoes', 'Sandals', 'Boots', 'Slides', 'Chappals'],
  Accessory:  ['Watch', 'Belt', 'Cap', 'Sunglasses', 'Bag', 'Wallet', 'Scarf', 'Bracelet'],
  Underlayer: ['Undershirt', 'Boxers', 'Socks', 'Tank Top'],
};
export const PATTERNS = ['Solid', 'Striped', 'Checked', 'Graphic', 'Textured', 'Other'] as const;
export const MATERIALS = ['Cotton', 'Linen', 'Denim', 'Wool', 'Synthetic', 'Blend', 'Leather', 'Unknown'] as const;
export const WEIGHTS = ['Light', 'Medium', 'Heavy'] as const;
export const FITS = ['Slim', 'Regular', 'Relaxed', 'Oversized', 'Unknown'] as const;
export const SLEEVES = ['Sleeveless', 'Short', '3/4', 'Long', 'N/A'] as const;
export const STATUSES = ['Clean', 'Dirty', 'At-cleaners', 'Storage', 'Retired'] as const;
export const SEASONS = ['Summer', 'Winter', 'Monsoon', 'All-year'] as const;
export const CONTEXTS = ['Gym', 'Office', 'Casual', 'Going-out', 'Home', 'Street'] as const;

export type Category = typeof CATEGORIES[number];
export type Pattern = typeof PATTERNS[number];
export type Material = typeof MATERIALS[number];
export type Weight = typeof WEIGHTS[number];
export type Fit = typeof FITS[number];
export type Sleeve = typeof SLEEVES[number];
export type Status = typeof STATUSES[number];
export type Season = typeof SEASONS[number];
export type Context = typeof CONTEXTS[number];

export interface Item {
  id: string;
  name: string;
  image_url: string | null;
  storage_path: string | null;
  category: Category;
  subcategory: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  pattern: Pattern | null;
  material_guess: Material | null;
  weight: Weight | null;
  formality: number;
  sleeve_length: Sleeve | null;
  season_tags: Season[];
  context_tags: Context[];
  fit: Fit | null;
  status: Status;
  confidence: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Classification {
  suggested_name: string;
  category: Category;
  subcategory: string;
  color_primary: string;
  color_secondary: string | null;
  pattern: Pattern;
  material_guess: Material;
  weight: Weight;
  formality: number;
  sleeve_length: Sleeve;
  season_tags: Season[];
  context_tags: Context[];
  fit: Fit;
  confidence: number;
  notes: string;
}
