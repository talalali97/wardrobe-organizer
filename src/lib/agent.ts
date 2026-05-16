import { supabaseAdmin } from './supabase';
import { getKarachiWeather } from './weather';

const MODEL = 'gemini-3.1-flash-lite';

const SYSTEM_PROMPT = `You are an outfit planning assistant for Talal, who lives in Karachi, Pakistan.
Karachi is hot most of the year (often 30-42°C). Monsoon brings humidity and rain.
Always check weather before proposing outfits. Always query the wardrobe filtered to status=Clean.
For rotation, prefer items with min_days_since_worn >= 2 unless the user requests something specific.

When proposing outfits:
- Coherent formality (don't mix gym shorts with a blazer)
- Weight matches temperature (Light for 30°C+, Medium for 22-30°C, Heavy below 22°C)
- Avoid pattern-on-pattern unless intentional
- Reasoning should be 1-3 sentences, concrete: cite the weather, the rotation, the context

Tone: direct, no fluff. Talal hates corporate politeness.
IMPORTANT: Respond in plain text only. No markdown, no asterisks, no bullet symbols.`;

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'get_weather',
      description: "Get current weather and today's forecast for Karachi. Returns temperature, conditions, humidity, precipitation. Call this first when planning outfits.",
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'query_wardrobe',
      description: 'Filter and retrieve wardrobe items. Use before proposing any outfit.',
      parameters: {
        type: 'OBJECT',
        properties: {
          status: { type: 'ARRAY', items: { type: 'STRING', enum: ['Clean', 'Dirty', 'At-cleaners', 'Storage', 'Retired'] } },
          category: { type: 'ARRAY', items: { type: 'STRING' } },
          context_tags: { type: 'ARRAY', items: { type: 'STRING' } },
          season_tags: { type: 'ARRAY', items: { type: 'STRING' } },
          weight: { type: 'ARRAY', items: { type: 'STRING', enum: ['Light', 'Medium', 'Heavy'] } },
          min_formality: { type: 'INTEGER' },
          max_formality: { type: 'INTEGER' },
          min_days_since_worn: { type: 'INTEGER', description: 'Exclude items worn within last N days (rotation)' },
          limit: { type: 'INTEGER' },
        },
      },
    },
    {
      name: 'propose_outfit',
      description: 'Submit a complete outfit recommendation. Call 1-3 times per request to offer options.',
      parameters: {
        type: 'OBJECT',
        required: ['item_ids', 'reasoning'],
        properties: {
          item_ids: { type: 'ARRAY', items: { type: 'STRING' } },
          reasoning: { type: 'STRING', description: 'Why these items: weather fit, formality, rotation, color match' },
          context_label: { type: 'STRING' },
        },
      },
    },
  ],
}];

async function executeTool(name: string, args: any): Promise<{ result: any; outfitId?: string }> {
  switch (name) {
    case 'get_weather': {
      try {
        return { result: await getKarachiWeather() };
      } catch (e: any) {
        return { result: { error: e.message } };
      }
    }

    case 'query_wardrobe': {
      let query = supabaseAdmin
        .from('items_with_wear')
        .select('id, name, category, subcategory, color_primary, pattern, material_guess, weight, formality, season_tags, context_tags, fit, status, days_since_worn, wear_count, image_url');

      if (args.status?.length) query = query.in('status', args.status);
      if (args.category?.length) query = query.in('category', args.category);
      if (args.weight?.length) query = query.in('weight', args.weight);
      if (typeof args.min_formality === 'number') query = query.gte('formality', args.min_formality);
      if (typeof args.max_formality === 'number') query = query.lte('formality', args.max_formality);
      if (args.context_tags?.length) query = query.overlaps('context_tags', args.context_tags);
      if (args.season_tags?.length) query = query.overlaps('season_tags', args.season_tags);
      if (typeof args.min_days_since_worn === 'number') {
        query = query.or(`days_since_worn.gte.${args.min_days_since_worn},days_since_worn.is.null`);
      }
      if (args.limit) query = query.limit(args.limit);

      const { data, error } = await query;
      if (error) return { result: { error: error.message } };
      return { result: data };
    }

    case 'propose_outfit': {
      const { item_ids, reasoning, context_label } = args;

      // Validate all item IDs exist
      const { data: valid } = await supabaseAdmin
        .from('items')
        .select('id')
        .in('id', item_ids);

      const validIds = (valid || []).map((r: any) => r.id);
      if (validIds.length !== item_ids.length) {
        return { result: { error: 'Some item IDs not found. Query wardrobe first to get valid IDs.' } };
      }

      const { data, error } = await supabaseAdmin
        .from('outfit_suggestions')
        .insert({ item_ids: validIds, reasoning, context_label: context_label || null })
        .select()
        .single();

      if (error) return { result: { error: error.message } };
      return { result: { success: true, outfit_id: data.id }, outfitId: data.id };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

export interface AgentResult {
  answer: string;
  outfitIds: string[];
}

export async function runAgent(history: any[], userMessage: string): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const contents: any[] = [
    ...history,
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const outfitIds: string[] = [];

  for (let i = 0; i < 8; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        tools: TOOLS,
        tool_config: { function_calling_config: { mode: 'AUTO' } },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 8192 },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Agent error: ${err.slice(0, 300)}`);
    }

    const data = await res.json();
    const parts: any[] = data?.candidates?.[0]?.content?.parts || [];

    const functionCallParts = parts.filter((p: any) => p.functionCall);

    if (functionCallParts.length === 0) {
      const text = parts.find((p: any) => p.text)?.text;
      return { answer: text || 'No response.', outfitIds };
    }

    // Preserve full model content verbatim (including thoughtSignature)
    contents.push({ role: 'model', parts });

    // Execute tools and collect responses
    const functionResponseParts: any[] = [];
    for (const part of functionCallParts) {
      const { name, args } = part.functionCall;
      const { result, outfitId } = await executeTool(name, args || {});
      if (outfitId) outfitIds.push(outfitId);
      functionResponseParts.push({
        functionResponse: { name, response: { content: result } },
      });
    }

    contents.push({ role: 'user', parts: functionResponseParts });
  }

  return { answer: 'Could not complete after max iterations.', outfitIds };
}
