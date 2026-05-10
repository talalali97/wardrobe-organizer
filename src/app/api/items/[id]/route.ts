import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

export const runtime = 'nodejs';

// PATCH /api/items/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await req.json();
    // Whitelist updatable fields
    const allowed = [
      'name', 'category', 'subcategory', 'color_primary', 'color_secondary',
      'pattern', 'material_guess', 'weight', 'formality', 'sleeve_length',
      'season_tags', 'context_tags', 'fit', 'status', 'notes'
    ];
    const safe: Record<string, any> = {};
    for (const k of allowed) {
      if (k in updates) safe[k] = updates[k];
    }

    const { data, error } = await supabaseAdmin
      .from('items')
      .update(safe)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/items/:id - removes both row and image
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get storage path before deleting row
    const { data: item } = await supabaseAdmin
      .from('items')
      .select('storage_path')
      .eq('id', params.id)
      .single();

    const { error: deleteError } = await supabaseAdmin
      .from('items')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Best-effort image cleanup (don't fail if it's not there)
    if (item?.storage_path) {
      await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([item.storage_path])
        .catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
