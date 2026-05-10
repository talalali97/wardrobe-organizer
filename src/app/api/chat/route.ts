import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'gemini-2.5-flash';

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('name, category, subcategory, color_primary, color_secondary, pattern, material_guess, weight, formality, sleeve_length, season_tags, context_tags, fit, status, notes')
      .order('category');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const systemText = `You are a wardrobe assistant for Talal, based in Karachi, Pakistan (hot climate, 35-45C summers, mild winters, monsoon season).
You have full access to his wardrobe inventory of ${items.length} items below.
Be direct, specific, and concise. Reference actual item names when relevant.
You can: count items, identify gaps, suggest outfits, give style advice, compare pieces, flag duplicates.

WARDROBE (${items.length} items):
${JSON.stringify(items)}`;

    const contents = [
      ...(Array.isArray(history) ? history : []),
      { role: 'user', parts: [{ text: question }] },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini chat error:', err);
      return NextResponse.json({ error: 'AI error' }, { status: 500 });
    }

    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });

    return NextResponse.json({ answer });
  } catch (e: any) {
    console.error('POST /api/chat error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
