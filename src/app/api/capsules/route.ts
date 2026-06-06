import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('capsules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ capsules: data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim() || !Array.isArray(body.item_ids) || body.item_ids.length === 0) {
      return NextResponse.json({ error: 'name and at least one item_id required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('capsules')
      .insert({
        name: body.name.trim(),
        item_ids: body.item_ids,
        occasion: body.occasion ?? null,
        description: body.description ?? '',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ capsule: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
