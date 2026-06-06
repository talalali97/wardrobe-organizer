import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST() {
  const { error, count } = await supabaseAdmin
    .from('items')
    .update({ status: 'Clean' })
    .eq('status', 'Dirty')
    .select('id', { count: 'exact', head: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cleaned: count ?? 0 });
}
