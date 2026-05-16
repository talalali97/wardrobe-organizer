import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10);
  const { data, error } = await supabaseAdmin
    .from('wear_log')
    .select('worn_at, context')
    .eq('item_id', params.id)
    .order('worn_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wears: data });
}
