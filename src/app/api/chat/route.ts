import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runAgent } from '@/lib/agent';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    const geminiHistory = (Array.isArray(history) ? history : []).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const { answer, outfitIds } = await runAgent(geminiHistory, question);

    // Fetch outfit suggestions with embedded item details
    let outfits: any[] = [];
    if (outfitIds.length > 0) {
      const { data: suggestions } = await supabaseAdmin
        .from('outfit_suggestions')
        .select('*')
        .in('id', outfitIds);

      if (suggestions) {
        const allItemIds = [...new Set(suggestions.flatMap((s: any) => s.item_ids))];
        const { data: items } = await supabaseAdmin
          .from('items')
          .select('id, name, image_url, category')
          .in('id', allItemIds);

        const itemMap = Object.fromEntries((items || []).map((i: any) => [i.id, i]));

        outfits = suggestions.map((s: any) => ({
          ...s,
          items: s.item_ids.map((id: string) => itemMap[id]).filter(Boolean),
        }));
      }
    }

    return NextResponse.json({ answer, outfits });
  } catch (e: any) {
    console.error('POST /api/chat error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
