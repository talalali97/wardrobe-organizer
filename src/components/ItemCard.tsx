'use client';

import { useState } from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import type { Item } from '@/lib/types';
import { Chip } from './Chip';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const lowConf = (item.confidence || 0) < 0.7;
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div
        onClick={() => onEdit(item)}
        className={`group bg-zinc-900 border rounded-sm overflow-hidden cursor-pointer transition-colors hover:border-accent ${
          lowConf ? 'border-accent/40' : 'border-zinc-800'
        }`}
      >
        <div className="aspect-square bg-zinc-950 relative overflow-hidden">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(true);
              }}
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

      {/* Fullscreen image overlay */}
      {fullscreen && item.image_url && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-50 p-2"
            onClick={() => setFullscreen(false)}
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.name}
            className="max-w-full max-h-full object-contain rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-0 right-0 text-center text-zinc-400 text-[12px] font-mono">
            {item.name}
          </div>
        </div>
      )}
    </>
  );
}
