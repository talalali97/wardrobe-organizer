'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Item } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';

interface ItemPickerProps {
  items: Item[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

export function ItemPicker({ items, selected, onToggle, onClose }: ItemPickerProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = items.filter(i => {
    if (filterCat !== 'all' && i.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || (i.color_primary ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex flex-col">
      <div className="bg-warm-900 border-b border-warm-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 transition-colors">
          <X size={18} />
        </button>
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-warm-950 border border-warm-700 text-zinc-50 pl-8 pr-3 py-2 text-[13px] rounded-sm font-mono outline-none"
          />
        </div>
        <span className="text-[11px] font-mono text-accent shrink-0">{selected.length} selected</span>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto shrink-0 border-b border-warm-700" style={{ scrollbarWidth: 'none' }}>
        {['all', ...CATEGORIES].map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-sm border shrink-0 transition-colors ${
              filterCat === c
                ? 'bg-accent text-zinc-950 border-accent'
                : 'bg-warm-800 text-zinc-400 border-warm-600 hover:border-zinc-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
          {filtered.map(item => {
            const isSelected = selected.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onToggle(item.id)}
                className={`cursor-pointer rounded-sm overflow-hidden border transition-all ${
                  isSelected ? 'border-accent ring-1 ring-accent/40' : 'border-warm-700 hover:border-zinc-500'
                }`}
              >
                <div className="aspect-square bg-warm-950 relative">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-600 text-[10px] font-mono">
                      {item.category[0]}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-zinc-950 text-[11px] font-bold">✓</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-1.5 bg-warm-900">
                  <div className="text-[10px] font-display text-zinc-300 truncate leading-tight">{item.name}</div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-zinc-600 font-mono text-[12px] mt-10">No items match</div>
        )}
      </div>

      {/* Confirm bar */}
      {selected.length > 0 && (
        <div className="px-4 py-3 border-t border-warm-700 bg-warm-900 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-accent text-zinc-950 font-display font-bold py-3 rounded-sm text-[14px]"
          >
            Done — {selected.length} item{selected.length > 1 ? 's' : ''} selected
          </button>
        </div>
      )}
    </div>
  );
}
