'use client';

import { AlertCircle, Trash2 } from 'lucide-react';
import type { Item } from '@/lib/types';
import { Chip } from './Chip';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const lowConf = (item.confidence || 0) < 0.7;

  return (
    <div
      onClick={() => onEdit(item)}
      className="group bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden cursor-pointer transition-colors hover:border-accent"
    >
      <div className="aspect-square bg-zinc-950 relative overflow-hidden">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-[11px] uppercase tracking-wider">
            no image
          </div>
        )}

        {lowConf && (
          <div className="absolute top-1.5 right-1.5 bg-accent-dim border border-accent-edge text-accent px-1.5 py-0.5 text-[9px] tracking-wider rounded-sm flex items-center gap-1">
            <AlertCircle size={9} /> REVIEW
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="absolute top-1.5 left-1.5 w-6 h-6 bg-zinc-950/85 border border-zinc-800 text-zinc-400 rounded-sm flex items-center justify-center hover:text-red-400 hover:border-red-400 transition-colors"
        >
          <Trash2 size={11} />
        </button>

        {item.status !== 'Clean' && (
          <div className="absolute bottom-1.5 right-1.5">
            <Chip tone="muted">{item.status}</Chip>
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="text-[13px] font-medium mb-1.5 truncate">
          {item.name}
        </div>
        <div className="flex flex-wrap gap-1">
          <Chip tone="accent">{item.category}</Chip>
          {item.color_primary && <Chip>{item.color_primary}</Chip>}
          {item.weight && <Chip tone="muted">{item.weight}</Chip>}
        </div>
      </div>
    </div>
  );
}
