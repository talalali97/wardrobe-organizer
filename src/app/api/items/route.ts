import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';
import { classifyImage, emptyClassification } from '@/lib/gemini';
import type { Classification } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/items - list all items
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('items_with_wear')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data });
}

// POST /api/items - create item from base64 image
// Body: { imageBase64: string, mimeType: string }
// Steps: classify -> upload to storage -> insert row
export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, hint } = await req.json();
    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'Missing imageBase64 or mimeType' }, { status: 400 });
    }

    // 1. Classify (with fallback if Gemini fails)
    let classification: Classification;
    let classifyFailed = false;
    try {
      classification = await classifyImage(imageBase64, mimeType, hint || undefined);
    } catch (e: any) {
      console.error('Classification failed:', e.message);
      classification = emptyClassification();
      classifyFailed = true;
    }

    // 2. Upload image to Supabase storage
    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const buffer = Buffer.from(imageBase64, 'base64');

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError);
      return NextResponse.json(
        { error: `Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    // 3. Insert row in items table
    const { data: item, error: insertError } = await supabaseAdmin
      .from('items')
      .insert({
        name: classification.suggested_name,
        image_url: urlData.publicUrl,
        storage_path: filename,
        category: classification.category,
        subcategory: classification.subcategory || null,
        color_primary: classification.color_primary || null,
        color_secondary: classification.color_secondary || null,
        pattern: classification.pattern,
        material_guess: classification.material_guess,
        weight: classification.weight,
        formality: classification.formality,
        sleeve_length: classification.sleeve_length,
        season_tags: classification.season_tags,
        context_tags: classification.context_tags,
        fit: classification.fit,
        status: 'Clean',
        notes: classification.notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert failed:', insertError);
      // Clean up the uploaded image if DB insert failed
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([filename]);
      return NextResponse.json(
        { error: `DB: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ item, classifyFailed });
  } catch (e: any) {
    console.error('POST /api/items error:', e);
    return NextResponse.json(
      { error: e.message || 'Server error' },
      { status: 500 }
    );
  }
}
