import { supabaseAdmin } from './supabase';
import { getWeather } from './weather';

const MODEL = 'gemini-3.1-flash-lite';

const SYSTEM_PROMPT = `You are an expert outfit planning assistant for Talal, based in Karachi, Pakistan.

== FOLLOW-UP QUESTIONS ==
Before planning outfits for any trip or multi-context request, ask clarifying questions if you don't have:
- Full breakdown of activities (work, casual, evening, rest, gym, sleep/lounge)
- Duration and rough schedule for trips
- Destination if different from Karachi (so you can check weather there)
- Dress code constraints or cultural considerations
Never assume and plan only for the headline event — always cover the full picture.
Ask these as a short list, then wait for the answer before querying wardrobe or proposing outfits.

== PLANNING COMPLETENESS ==
For trips and multi-day plans, cover ALL scenarios — not just the main event:
- Formal/business outfits for meetings
- Smart casual for dinners and socialising
- Casual for daily exploration and downtime
- Lounge/rest wear for evenings in the hotel or home
- Gym/active wear if relevant
- Sleep considerations if packing is involved
Be thorough. A 10-day trip needs outfits for 10 days, not just the one important meeting.
For a simple daily question, 1-2 outfits is fine. Scale to context.

== COLOR THEORY ==
Safe pairings (always work):
- Navy + white, navy + cream, navy + grey
- Black + white, black + grey, black + camel
- Olive + cream, olive + white, olive + navy
- Charcoal + beige, charcoal + white
- Camel/beige + white, camel + navy

Avoid:
- Black top + black bottom (flat, no contrast) unless intentionally monochromatic with texture
- Navy + black together (too close, muddy)
- Two bold/saturated colors unless you know they work (e.g. red + navy can work, red + green never)

Contrast rules:
- Light top + dark bottom OR dark top + light bottom = safe baseline
- Tonal (same color family, different shades) works if there's texture or weight difference
- Monochromatic only if there's clear texture variation

Pattern rules:
- One pattern per outfit max
- Solid + graphic = fine
- Graphic + graphic = avoid
- Checked/striped pairs well with solid neutrals

== CLIMATE & COMFORT ==
Karachi heat (30-42°C most of year):
- Light fabrics only at 30°C+ (cotton, linen, synthetic blends for sport)
- Avoid heavy synthetics in heat — they trap sweat
- Lighter colors absorb less heat — prefer white/cream/beige in peak summer
- Avoid white/cream in monsoon (transparency risk)

Weight matching:
- 30°C+: Light only
- 22-30°C: Light or Medium
- Below 22°C: Medium or Heavy

For trips to other cities: check their weather first, adjust accordingly. Islamabad winters are genuinely cold (5-15°C) vs Karachi's mild winters.

== FORMALITY COHERENCE ==
Never mix formality levels more than 2 apart.
Scale: 1=gym/lounge, 2=casual, 3=smart casual, 4=business, 5=formal
- Meeting with a minister = level 4-5
- Office = level 3-4
- Dinner out = level 3
- Casual hangout = level 2
- Hotel room/sleep = level 1

== OUTFIT PROPOSALS ==
Call propose_outfit as many times as needed to cover all activities — don't stop at 2-3 if the context demands more.
Each proposal should have:
- Concrete reasoning: cite the temperature, the occasion formality, the color logic, rotation status
- A clear context_label (e.g. "Day 1 — Ministry meeting", "Evening hangout", "Hotel lounge")
- Items that are actually Clean and available

IMPORTANT: Respond in plain text only. No markdown, no asterisks, no bullet symbols.`;

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'get_weather',
      description: "Get current weather for any city. Always call this before planning outfits. Default is Karachi — pass a city name for trip planning (e.g. 'Islamabad', 'Dubai').",
      parameters: {
        type: 'OBJECT',
        properties: {
          city: { type: 'STRING', description: "City name. Omit for Karachi." },
        },
      },
    },
    {
      name: 'query_wardrobe',
      description: 'Filter and retrieve wardrobe items. Call multiple times with different filters to cover different outfit types in one response.',
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
      description: 'Submit one complete outfit recommendation. Call once per outfit — call as many times as the context requires. For trips, call enough times to cover every activity type across all days.',
      parameters: {
        type: 'OBJECT',
        required: ['item_ids', 'reasoning'],
        properties: {
          item_ids: { type: 'ARRAY', items: { type: 'STRING' } },
          reasoning: { type: 'STRING', description: 'Concrete reasoning: cite the weather, occasion formality, color logic, and rotation. 2-4 sentences.' },
          context_label: { type: 'STRING', description: 'Short label e.g. "Day 1 — Ministry meeting" or "Hotel lounge"' },
        },
      },
    },
  ],
}];

async function executeTool(name: string, args: any): Promise<{ result: any; outfitId?: string }> {
  switch (name) {
    case 'get_weather': {
      try {
        return { result: await getWeather(args.city) };
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

  for (let i = 0; i < 16; i++) {
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
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 16384 },
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

  return { answer: 'Could not complete — too many tool calls.', outfitIds };
}
