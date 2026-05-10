// Client-side image processing
export async function resizeToBase64(
  file: File,
  maxDim = 800,
  quality = 0.8,
  rotation = 0 // degrees: 0, 90, 180, 270
): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
  // createImageBitmap with imageOrientation:'from-image' auto-corrects EXIF rotation
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const scaledW = Math.round(bitmap.width * scale);
  const scaledH = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const deg = ((rotation % 360) + 360) % 360;
  const swap = deg === 90 || deg === 270;
  canvas.width  = swap ? scaledH : scaledW;
  canvas.height = swap ? scaledW : scaledH;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(bitmap, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Resize blob failed'));
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({ base64: dataUrl.split(',')[1], dataUrl, mimeType: 'image/jpeg' });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export function itemsToCsv(items: any[]): string {
  const cols = [
    'id', 'name', 'category', 'subcategory', 'color_primary', 'color_secondary',
    'pattern', 'material_guess', 'weight', 'formality', 'sleeve_length',
    'season_tags', 'context_tags', 'fit', 'status', 'confidence', 'notes',
    'image_url', 'created_at'
  ];
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('|') : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = items.map(i => cols.map(c => esc(i[c])).join(','));
  return [cols.join(','), ...rows].join('\n');
}
