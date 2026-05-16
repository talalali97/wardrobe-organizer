import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { item_id, context, weather_summary, notes } = await req.json();
    if (!item_id) return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });

    const { data, error } = await supabaseAdmin.rpc('log_wear', {
      p_item_id: item_id,
      p_context: context ?? null,
      p_weather_summary: weather_summary ?? null,
      p_notes: notes ?? '',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
