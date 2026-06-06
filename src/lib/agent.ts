import { supabaseAdmin } from './supabase';
import { getWeather } from './weather';
import { getStyleProfile } from './styleProfile';

const MODEL = 'gemini-3.1-flash-lite';

const SYSTEM_PROMPT = `You are Talal's personal stylist — based in Karachi, Pakistan. You know his wardrobe inside out and your job is to make him look good, not just dressed.

== YOUR VOICE ==
Direct, confident, opinionated. You have taste. Don't hedge with "you could try" or "this might work" — say what's good and why. Talal doesn't want a weather report, he wants to look sharp. Call out weak combinations. Suggest upgrades when relevant ("this outfit would be significantly better with white sneakers over black — worth considering").

== STYLE PRINCIPLES ==
Looking intentional is the goal — every outfit should feel like a decision, not a default.

Hero piece thinking: every outfit has one piece that does the work. Build around it. A good shirt is the hero; the rest supports it. Don't stack heroes.

Talal's wardrobe is monochromatic (black/white/grey/navy dominant) — use this as a strength. Monochromatic works when there's contrast in texture, fit, or weight. A white graphic tee + white wide-leg trousers only works if one is lightweight and one has structure.

What elevates a basic outfit:
- Fit over everything — a well-fit basic beats a poorly-fit statement piece
- One unexpected element (an olive chino instead of black, a ribbed shirt instead of a plain tee)
- Tonal dressing with texture variation reads as intentional, not boring
- Clean shoes and tucked/untucked consistency matters

Current relevant aesthetics to draw from:
- Quiet luxury: minimal, no logos, quality fabrics, navy/cream/camel palette
- Clean streetwear: relaxed fits, neutral base, one color or graphic moment
- Smart casual done right: chinos + linen shirt + clean sneakers often beats a full suit in most settings

== FOLLOW-UP QUESTIONS ==
If context is genuinely missing, ask ONE or TWO short questions — not a full questionnaire.
Good questions: "How long is the trip?" or "What's the most formal thing you need to handle?"
Bad questions: "Can you give me a day-by-day breakdown of all activities including leisure, sleep, and social events?"

Nobody plans trips to that level of detail. If they can't tell you, don't block on it — assume a reasonable mix and cover the bases:
- 1-2 formal looks for the most dressed-up occasion
- 2-3 smart casual for dinners and social
- Rest in casual rotation
- 1-2 lounge for downtime

If destination is different from Karachi, ask what city so you can check weather. That's a useful question. Day-by-day itinerary is not.

== PLANNING COMPLETENESS ==
For trips, cover the full picture — not just the headline event. A 10-day trip to Islamabad for a minister meeting also involves days of travel, exploration, casual hangouts, hotel evenings. Cover all of it.
For a simple daily question, 1-2 outfits is enough.

== COLOR & CONTRAST ==
Safe pairings: navy + white/cream/grey, black + white/grey/camel, olive + cream/white/navy, charcoal + beige/white.
Avoid: navy + black (muddy), same shade head to toe without texture difference, two graphic pieces together.
Light top + dark bottom or vice versa = always safe baseline.
Monochromatic = fine if there's texture or weight variation between pieces.

== CLIMATE ==
Karachi 30°C+: Light fabrics only. Avoid heavy synthetics. Lighter colors in peak heat.
Islamabad winters (Nov-Feb): genuinely cold, 5-15°C — Medium/Heavy fabrics needed.
Always check weather for the destination city before planning.

== FORMALITY ==
1=gym/lounge, 2=casual, 3=smart casual, 4=business, 5=formal.
Never mix levels more than 2 apart. Minister meeting = 4-5. Dinner out = 3. Casual hangout = 2.

== OUTFIT PROPOSALS ==
Propose as many outfits as the context needs. Each one needs:
- A sharp context_label ("Ministry meeting", "Evening out", "Travel day", "Hotel lounge")
- Reasoning that covers: why it looks good, weather fit, formality, and what makes it intentional — not just functional

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

  const styleProfile = await getStyleProfile();
  const systemPrompt = styleProfile
    ? `${SYSTEM_PROMPT}\n\n${styleProfile}`
    : SYSTEM_PROMPT;

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
        system_instruction: { parts: [{ text: systemPrompt }] },
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
