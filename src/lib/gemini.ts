import type { Classification } from './types';

const MODEL = 'gemini-2.5-flash';

const PROMPT = `You are classifying a clothing item photo for a wardrobe inventory system.

Climate context: User is in Karachi, Pakistan — very hot summers (35-45C), mild winters, monsoon season. Bias season tags and weight accordingly: most items default to summer-weight unless clearly heavy fabric.

Classify the visible clothing item with these guidelines:
- suggested_name: short descriptive name e.g. "Black graphic tee", "Olive cargo pants", "Brown leather sneakers"
- category: bucket the item into one high-level type
- subcategory: pick the closest match from these lists (do NOT invent new values):
  Top → T-shirt, Polo, Shirt, Henley, Hoodie, Sweatshirt, Tank Top, Kameez, Kurta, Sweater
  Bottom → Jeans, Chinos, Trousers, Shorts, Wide-leg Trousers, Track Pants, Joggers, Cargo Pants, Sweatpants, Shalwar
  Outerwear → Jacket, Blazer, Coat, Windbreaker, Hoodie, Gilet
  Shoes → Sneakers, Loafers, Dress Shoes, Sandals, Boots, Slides, Chappals
  Accessory → Watch, Belt, Cap, Sunglasses, Bag, Wallet, Scarf, Bracelet
  Underlayer → Undershirt, Boxers, Socks, Tank Top
  NOTE: Joggers = tapered leg + drawstring waist. Wide-leg or baggy drawstring pants = Wide-leg Trousers or Track Pants.
- formality: 1=gym/loungewear, 2=casual, 3=smart casual, 4=business, 5=formal
- weight: visual fabric thickness — Light for thin breathable, Medium for standard, Heavy for coats/winter wear
- sleeve_length: use "N/A" for shoes, accessories, and bottoms
- confidence: 0.0-1.0, your confidence in the overall classification
- notes: visible details, brand if readable, defects, distinguishing features, or empty string

Return ONLY the JSON object matching the schema. No markdown, no preamble.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggested_name: { type: 'STRING' },
    category: { type: 'STRING', enum: ['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessory', 'Underlayer'] },
    subcategory: { type: 'STRING' },
    color_primary: { type: 'STRING' },
    color_secondary: { type: 'STRING', nullable: true },
    pattern: { type: 'STRING', enum: ['Solid', 'Striped', 'Checked', 'Graphic', 'Textured', 'Other'] },
    material_guess: { type: 'STRING', enum: ['Cotton', 'Linen', 'Denim', 'Wool', 'Synthetic', 'Blend', 'Leather', 'Unknown'] },
    weight: { type: 'STRING', enum: ['Light', 'Medium', 'Heavy'] },
    formality: { type: 'INTEGER' },
    sleeve_length: { type: 'STRING', enum: ['Sleeveless', 'Short', '3/4', 'Long', 'N/A'] },
    season_tags: { type: 'ARRAY', items: { type: 'STRING', enum: ['Summer', 'Winter', 'Monsoon', 'All-year'] } },
    context_tags: { type: 'ARRAY', items: { type: 'STRING', enum: ['Gym', 'Office', 'Casual', 'Going-out', 'Home', 'Street'] } },
    fit: { type: 'STRING', enum: ['Slim', 'Regular', 'Relaxed', 'Oversized', 'Unknown'] },
    confidence: { type: 'NUMBER' },
    notes: { type: 'STRING' }
  },
  required: ['suggested_name', 'category', 'subcategory', 'color_primary', 'pattern',
    'material_guess', 'weight', 'formality', 'sleeve_length', 'season_tags',
    'context_tags', 'fit', 'confidence', 'notes']
};

export async function classifyImage(base64: string, mimeType: string, hint?: string): Promise<Classification> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const promptText = hint?.trim()
    ? `${PROMPT}\n\nUser note about this item: "${hint.trim()}"`
    : PROMPT;

  const body = {
    contents: [{
      parts: [
        { text: promptText },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA
    }
  };

  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        // Retry on 429 / 5xx
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');

      const parsed = JSON.parse(text) as Classification;
      // Sanity defaults
      if (!parsed.season_tags) parsed.season_tags = [];
      if (!parsed.context_tags) parsed.context_tags = [];
      if (typeof parsed.confidence !== 'number') parsed.confidence = 0.5;
      return parsed;
    } catch (e) {
      lastError = e;
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  throw lastError || new Error('Classification failed');
}

export function emptyClassification(): Classification {
  return {
    suggested_name: 'Untitled item',
    category: 'Top',
    subcategory: '',
    color_primary: '',
    color_secondary: null,
    pattern: 'Solid',
    material_guess: 'Unknown',
    weight: 'Medium',
    formality: 3,
    sleeve_length: 'N/A',
    season_tags: [],
    context_tags: [],
    fit: 'Unknown',
    confidence: 0,
    notes: 'AI classification failed - please edit manually'
  };
}
