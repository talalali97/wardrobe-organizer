'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Play } from 'lucide-react';
import type { Item } from '@/lib/types';
import { type SavedOutfit, type Capsule, OCCASIONS, formatLastWorn } from '@/lib/outfitUtils';
import { ItemPicker } from './ItemPicker';

interface LibraryOverlayProps {
  items: Item[];
  onClose: () => void;
  onWoreOutfit: (itemIds: string[]) => void;
}

type Tab = 'outfits' | 'capsules';
type BuilderMode = 'outfit' | 'capsule' | null;

// ── Outfit Card ──────────────────────────────────────────────────────────────

function OutfitCard({
  outfit, items, onWear, onDelete,
}: {
  outfit: SavedOutfit;
  items: Item[];
  onWear: () => void;
  onDelete: () => void;
}) {
  const outfitItems = outfit.item_ids.map(id => items.find(i => i.id === id)).filter(Boolean) as Item[];
  const dirtyCount = outfitItems.filter(i => i.status === 'Dirty').length;
  const allDirty = dirtyCount === outfitItems.length && outfitItems.length > 0;

  return (
    <div className="bg-warm-800 border border-warm-700 rounded-sm p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-display font-semibold text-zinc-100 leading-tight">{outfit.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {outfit.occasion && <span className="text-[10px] font-mono text-accent">{outfit.occasion}</span>}
            {outfit.wear_count > 0 && (
              <span className="text-[10px] font-mono text-zinc-600">
                worn {outfit.wear_count}× {formatLastWorn(outfit.last_worn) ? `· ${formatLastWorn(outfit.last_worn)}` : ''}
              </span>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {outfitItems.map(item => (
          <div key={item.id} className="shrink-0">
            <div className="w-[72px] h-[72px] bg-warm-950 rounded-sm overflow-hidden border border-warm-700">
              {item.image_url
                ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                : <div className="w-full h-full flex items-center justify-center text-warm-600 text-[10px] font-mono">{item.category[0]}</div>}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onWear}
        disabled={allDirty}
        title={allDirty ? 'All items are dirty' : 'Log as worn and mark all dirty'}
        className="w-full bg-accent text-zinc-950 font-display font-bold py-2.5 rounded-sm text-[13px] disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
      >
        <Play size={12} fill="currentColor" />
        {allDirty ? 'All dirty' : dirtyCount > 0 ? `Wear (${dirtyCount} already dirty)` : 'Wore this'}
      </button>
    </div>
  );
}

// ── Capsule Card ─────────────────────────────────────────────────────────────

function CapsuleCard({
  capsule, items, onDelete,
}: {
  capsule: Capsule;
  items: Item[];
  onDelete: () => void;
}) {
  const capsuleItems = capsule.item_ids.map(id => items.find(i => i.id === id)).filter(Boolean) as Item[];
  const cleanCount = capsuleItems.filter(i => i.status === 'Clean').length;

  const exportList = () => {
    const byCategory: Record<string, string[]> = {};
    capsuleItems.forEach(i => {
      if (!byCategory[i.category]) byCategory[i.category] = [];
      byCategory[i.category].push(i.name);
    });
    const text = `${capsule.name}\n${'─'.repeat(capsule.name.length)}\n\n` +
      Object.entries(byCategory).map(([cat, names]) => `${cat}\n${names.map(n => `  • ${n}`).join('\n')}`).join('\n\n');
    navigator.clipboard?.writeText(text).catch(() => null);
    alert('Packing list copied to clipboard');
  };

  return (
    <div className="bg-warm-800 border border-warm-700 rounded-sm p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-display font-semibold text-zinc-100 leading-tight">{capsule.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {capsule.occasion && <span className="text-[10px] font-mono text-accent">{capsule.occasion}</span>}
            <span className="text-[10px] font-mono text-zinc-600">{capsuleItems.length} items · {cleanCount} clean</span>
          </div>
          {capsule.description && <div className="text-[11px] font-mono text-zinc-600 mt-1">{capsule.description}</div>}
        </div>
        <button onClick={onDelete} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {capsuleItems.slice(0, 8).map(item => (
          <div key={item.id} className="w-[56px] h-[56px] shrink-0 bg-warm-950 rounded-sm overflow-hidden border border-warm-700">
            {item.image_url
              ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
              : <div className="w-full h-full flex items-center justify-center text-warm-600 text-[9px] font-mono">{item.category[0]}</div>}
          </div>
        ))}
        {capsuleItems.length > 8 && (
          <div className="w-[56px] h-[56px] shrink-0 bg-warm-800 border border-warm-700 rounded-sm flex items-center justify-center text-[10px] font-mono text-zinc-600">
            +{capsuleItems.length - 8}
          </div>
        )}
      </div>

      <button
        onClick={exportList}
        className="w-full border border-warm-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 font-display py-2.5 rounded-sm text-[13px] transition-colors"
      >
        Copy packing list
      </button>
    </div>
  );
}

// ── Builder ──────────────────────────────────────────────────────────────────

function Builder({
  mode, items, onSave, onClose,
}: {
  mode: 'outfit' | 'capsule';
  items: Item[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleItem = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectedItems = selectedIds.map(id => items.find(i => i.id === id)).filter(Boolean) as Item[];

  const handleSave = async () => {
    if (!name.trim() || selectedIds.length === 0) return;
    setSaving(true);
    const endpoint = mode === 'outfit' ? '/api/outfits' : '/api/capsules';
    const body = mode === 'outfit'
      ? { name: name.trim(), item_ids: selectedIds, occasion: occasion || null }
      : { name: name.trim(), item_ids: selectedIds, occasion: occasion || null, description };

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    onSave();
  };

  const inputClass = 'w-full bg-warm-950 border border-warm-700 text-zinc-50 px-3 py-2.5 text-[14px] rounded-sm font-display outline-none focus:border-accent/50 transition-colors';

  return (
    <>
      {showPicker && (
        <ItemPicker
          items={items}
          selected={selectedIds}
          onToggle={toggleItem}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-display font-semibold text-zinc-300 uppercase tracking-wider">
            New {mode}
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Item selection */}
        <div>
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Items</div>
          {selectedItems.length > 0 ? (
            <div className="flex gap-2 flex-wrap mb-2">
              {selectedItems.map(item => (
                <div key={item.id} className="relative">
                  <div className="w-16 h-16 bg-warm-950 rounded-sm overflow-hidden border border-warm-700">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                      : <div className="w-full h-full flex items-center justify-center text-warm-600 text-[10px] font-mono">{item.category[0]}</div>}
                  </div>
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-800 border border-zinc-600 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 text-[8px]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <button
            onClick={() => setShowPicker(true)}
            className="w-full border border-dashed border-warm-600 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 py-3 rounded-sm text-[13px] font-display transition-colors"
          >
            {selectedIds.length === 0 ? '+ Pick items' : `+ Add more (${selectedIds.length} selected)`}
          </button>
        </div>

        <div>
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Name</div>
          <input
            className={inputClass}
            placeholder={mode === 'outfit' ? 'e.g. Navy dinner look' : 'e.g. Travel capsule'}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Occasion</div>
          <div className="flex gap-1.5 flex-wrap">
            {OCCASIONS.map(o => (
              <button
                key={o}
                onClick={() => setOccasion(occasion === o ? '' : o)}
                className={`px-2.5 py-1 text-[12px] font-mono rounded-sm border transition-colors ${
                  occasion === o ? 'bg-accent text-zinc-950 border-accent' : 'bg-warm-800 text-zinc-400 border-warm-600 hover:border-zinc-500'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {mode === 'capsule' && (
          <div>
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Description (optional)</div>
            <textarea
              className={`${inputClass} min-h-[70px] resize-none`}
              placeholder="e.g. 8 pieces that mix and match for any trip"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!name.trim() || selectedIds.length === 0 || saving}
          className="w-full bg-accent text-zinc-950 font-display font-bold py-3 rounded-sm text-[14px] disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Saving...' : `Save ${mode}`}
        </button>
      </div>
    </>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────────

export function LibraryOverlay({ items, onClose, onWoreOutfit }: LibraryOverlayProps) {
  const [tab, setTab] = useState<Tab>('outfits');
  const [builder, setBuilder] = useState<BuilderMode>(null);
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(true);
  const [loadingCapsules, setLoadingCapsules] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    fetch('/api/outfits').then(r => r.json()).then(d => { setOutfits(d.outfits ?? []); setLoadingOutfits(false); });
    fetch('/api/capsules').then(r => r.json()).then(d => { setCapsules(d.capsules ?? []); setLoadingCapsules(false); });
  }, []);

  const reloadOutfits = () => fetch('/api/outfits').then(r => r.json()).then(d => setOutfits(d.outfits ?? []));
  const reloadCapsules = () => fetch('/api/capsules').then(r => r.json()).then(d => setCapsules(d.capsules ?? []));

  const wearOutfit = async (outfit: SavedOutfit) => {
    await fetch(`/api/outfits/${outfit.id}/wear`, { method: 'POST' });
    onWoreOutfit(outfit.item_ids);
    reloadOutfits();
  };

  const deleteOutfit = async (id: string) => {
    if (!confirm('Delete this outfit?')) return;
    await fetch(`/api/outfits/${id}`, { method: 'DELETE' });
    setOutfits(prev => prev.filter(o => o.id !== id));
  };

  const deleteCapsule = async (id: string) => {
    if (!confirm('Delete this capsule?')) return;
    await fetch(`/api/capsules/${id}`, { method: 'DELETE' });
    setCapsules(prev => prev.filter(c => c.id !== id));
  };

  if (builder) {
    return (
      <div className="fixed inset-0 bg-warm-950 z-50 overflow-y-auto">
        <Builder
          mode={builder}
          items={items}
          onClose={() => setBuilder(null)}
          onSave={() => {
            setBuilder(null);
            if (builder === 'outfit') reloadOutfits();
            else reloadCapsules();
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-warm-950 z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-warm-700 flex items-center justify-between shrink-0">
        <div className="text-[16px] font-display font-bold text-zinc-100">Library</div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs + New button */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-warm-700 shrink-0">
        <div className="flex gap-1">
          {(['outfits', 'capsules'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[12px] font-mono rounded-sm transition-colors capitalize ${
                tab === t ? 'bg-accent text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setBuilder(tab === 'outfits' ? 'outfit' : 'capsule')}
          className="flex items-center gap-1.5 text-[12px] font-mono text-accent hover:text-accent/80 transition-colors"
        >
          <Plus size={13} /> New {tab === 'outfits' ? 'outfit' : 'capsule'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {tab === 'outfits' && (
          loadingOutfits ? (
            <div className="text-center text-zinc-600 font-mono text-[12px] mt-10">Loading...</div>
          ) : outfits.length === 0 ? (
            <div className="text-center text-zinc-700 font-mono text-[12px] mt-10">
              No saved outfits yet.{'\n'}Save an agent suggestion or build one from scratch.
            </div>
          ) : outfits.map(outfit => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              items={items}
              onWear={() => wearOutfit(outfit)}
              onDelete={() => deleteOutfit(outfit.id)}
            />
          ))
        )}

        {tab === 'capsules' && (
          loadingCapsules ? (
            <div className="text-center text-zinc-600 font-mono text-[12px] mt-10">Loading...</div>
          ) : capsules.length === 0 ? (
            <div className="text-center text-zinc-700 font-mono text-[12px] mt-10">
              No capsules yet.{'\n'}Build one for travel, work, or a specific season.
            </div>
          ) : capsules.map(capsule => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              items={items}
              onDelete={() => deleteCapsule(capsule.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
