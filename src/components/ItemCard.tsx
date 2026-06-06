'use client';

import { AlertCircle, Trash2 } from 'lucide-react';
import type { Item } from '@/lib/types';
import { isNeedsReview } from '@/lib/utils';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onStatusToggle: (id: string, status: 'Clean' | 'Dirty') => void;
  isDuplicate?: boolean;
}

export function ItemCard({ item, onEdit, onDelete, onStatusToggle, isDuplicate }: ItemCardProps) {
  const lowConf = isNeedsReview(item);
  const canToggle = item.status === 'Clean' || item.status === 'Dirty';

  const sublabel = [item.subcategory, item.color_primary].filter(Boolean).join(' · ');

  return (
    <div
      onClick={() => onEdit(item)}
      className={`group bg-warm-900 border rounded-sm overflow-hidden cursor-pointer transition-all hover:border-accent hover:-translate-y-px ${
        lowConf ? 'border-accent/30' : 'border-warm-700'
      }`}
    >
      {/* Image — portrait ratio */}
      <div className="aspect-[3/4] bg-warm-950 relative overflow-hidden">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-warm-600 text-[10px] uppercase tracking-widest font-mono">
            no image
          </div>
        )}

        {/* Top-left: delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-2 left-2 w-6 h-6 bg-warm-950/80 border border-warm-700 text-zinc-500 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-400 hover:border-red-400/50 transition-all"
        >
          <Trash2 size={10} />
        </button>

        {/* Top-right: review / dup badge */}
        {lowConf ? (
          <div className="absolute top-2 right-2 bg-warm-950/80 border border-accent/40 text-accent px-1.5 py-0.5 text-[9px] tracking-wider rounded-sm flex items-center gap-1 font-mono">
            <AlertCircle size={8} /> REVIEW
          </div>
        ) : isDuplicate ? (
          <div className="absolute top-2 right-2 bg-warm-950/80 border border-warm-600 text-zinc-600 px-1.5 py-0.5 text-[9px] tracking-wider rounded-sm font-mono">
            DUP
          </div>
        ) : null}

        {/* Bottom-right: status toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); if (canToggle) onStatusToggle(item.id, item.status === 'Clean' ? 'Dirty' : 'Clean'); }}
          className={`absolute bottom-2 right-2 px-1.5 py-0.5 text-[9px] tracking-wider rounded-sm border font-mono transition-colors ${
            item.status === 'Dirty'
              ? 'bg-accent-dim border-accent/40 text-accent'
              : item.status === 'Clean'
              ? 'bg-warm-950/60 border-warm-600 text-zinc-700 hover:text-zinc-400 hover:border-zinc-600 opacity-0 group-hover:opacity-100'
              : 'bg-warm-950/60 border-warm-600 text-zinc-600 cursor-default'
          }`}
        >
          {item.status === 'Clean' ? '✓' : item.status.toLowerCase()}
        </button>
      </div>

      {/* Info */}
      <div className="p-2.5 pt-2">
        {sublabel && (
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1 truncate">
            {sublabel}
          </div>
        )}
        <div className="text-[13px] font-display font-medium leading-tight truncate text-zinc-100">
          {item.name}
        </div>
        {/* Only show cost-per-wear if actionably high — no other chips */}
        {item.price != null && item.wear_count > 0 && item.price / item.wear_count > 500 && (
          <div className="mt-1.5 text-[9px] font-mono text-zinc-600">
            ₨{Math.round(item.price / item.wear_count)}/wear
          </div>
        )}
      </div>
    </div>
  );
}
