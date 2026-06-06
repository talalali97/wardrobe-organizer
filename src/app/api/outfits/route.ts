import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateOutfitPayload } from '@/lib/outfitUtils';

export const runtime = 'nodejs';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('outfits')
    .select('*')
    .order('last_worn', { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ outfits: data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!validateOutfitPayload(body)) {
      return NextResponse.json({ error: 'name and at least one item_id required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('outfits')
      .insert({
        name: body.name.trim(),
        item_ids: body.item_ids,
        occasion: body.occasion ?? null,
        notes: body.notes ?? '',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ outfit: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
