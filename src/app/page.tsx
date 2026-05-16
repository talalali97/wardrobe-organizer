'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, RotateCcw, RotateCw, Search, Loader2 } from 'lucide-react';
import { CATEGORIES, SEASONS, CONTEXTS, type Item } from '@/lib/types';
import { resizeToBase64, itemsToCsv } from '@/lib/image';
import { DropZone } from '@/components/DropZone';
import { ItemCard } from '@/components/ItemCard';
import { ItemEditor } from '@/components/ItemEditor';
import { ChatPanel } from '@/components/ChatPanel';

interface QueueItem {
  id: string;
  filename: string;
  status: 'pending' | 'resizing' | 'classifying' | 'done' | 'error';
  error?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const COLOR_CSS: Record<string, string> = {
  'Black': '#09090b', 'White': '#fafafa', 'Off-white': '#f5f0e8', 'Cream': '#fffbeb',
  'Grey': '#71717a', 'Light Grey': '#a1a1aa', 'Dark Grey': '#3f3f46', 'Charcoal': '#27272a',
  'Beige': '#d4b896', 'Camel': '#c19a6b', 'Brown': '#92400e', 'Dark Brown': '#431407',
  'Navy': '#1e3a5f', 'Navy Blue': '#1e3a5f', 'Dark Blue': '#1e3a8a', 'Blue': '#3b82f6',
  'Light Blue': '#93c5fd', 'Sky Blue': '#7dd3fc',
  'Olive': '#6b7c3a', 'Olive Green': '#6b7c3a', 'Green': '#22c55e', 'Dark Green': '#15803d', 'Khaki': '#c3b091',
  'Maroon': '#7f1d1d', 'Burgundy': '#9f1239', 'Red': '#ef4444',
  'Orange': '#f97316', 'Yellow': '#eab308', 'Pink': '#ec4899', 'Purple': '#a855f7', 'Teal': '#0d9488',
};
const colorToCss = (name: string) => COLOR_CSS[name] ?? '#52525b';

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [hint, setHint] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterContexts, setFilterContexts] = useState<string[]>([]);
  const [filterSeasons, setFilterSeasons] = useState<string[]>([]);
  const [rotation, setRotation] = useState(0);


  // Load items
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/items');
        if (!res.ok) throw new Error('Load failed');
        const data = await res.json();
        setItems(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateItem = async (updated: Item) => {
    const res = await fetch(`/api/items/${updated.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === data.item.id ? data.item : i))
      );
      setEditing(null);
    } else {
      alert('Save failed');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const toggleStatus = async (id: string, status: 'Clean' | 'Dirty') => {
    if (status === 'Dirty') {
      // Log a wear event — RPC atomically inserts wear_log + sets status=Dirty
      const now = new Date().toISOString();
      setItems((prev) => prev.map((i) =>
        i.id === id
          ? { ...i, status: 'Dirty', wear_count: (i.wear_count || 0) + 1, last_worn: now, days_since_worn: 0 }
          : i
      ));
      await fetch('/api/wear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: id }),
      });
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    }
  };

  const exportCsv = () => {
    if (items.length === 0) return alert('Nothing to export.');
    const csv = itemsToCsv(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wardrobe_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lockOut = async () => {
    await fetch('/api/unlock', { method: 'DELETE' }).catch(() => null);
    document.cookie = 'app_pwd=; path=/; max-age=0';
    window.location.href = '/unlock';
  };

  const processFiles = useCallback(async (files: File[], userHint?: string, userRotation = 0) => {
    const arr = files.filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) return;

    const queued: QueueItem[] = arr.map((f) => ({
      id: uid(),
      filename: f.name,
      status: 'pending',
    }));
    setQueue((prev) => [...prev, ...queued]);

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const q = queued[i];

      setQueue((prev) =>
        prev.map((x) => (x.id === q.id ? { ...x, status: 'resizing' } : x))
      );

      let resized;
      try {
        resized = await resizeToBase64(file, 800, 0.8, userRotation);
      } catch (e: any) {
        setQueue((prev) =>
          prev.map((x) =>
            x.id === q.id ? { ...x, status: 'error', error: 'resize failed' } : x
          )
        );
        continue;
      }

      setQueue((prev) =>
        prev.map((x) =>
          x.id === q.id ? { ...x, status: 'classifying' } : x
        )
      );

      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: resized.base64,
            mimeType: resized.mimeType,
            hint: userHint || undefined,
          }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'failed' }));
          throw new Error(error || `${res.status}`);
        }
        const { item } = await res.json();
        setItems((prev) => [item, ...prev]);
        setQueue((prev) =>
          prev.map((x) => (x.id === q.id ? { ...x, status: 'done' } : x))
        );
      } catch (e: any) {
        console.error(e);
        setQueue((prev) =>
          prev.map((x) =>
            x.id === q.id
              ? { ...x, status: 'error', error: e.message?.slice(0, 30) || 'failed' }
              : x
          )
        );
      }
    }

    // Remove successful items from queue after delay
    setTimeout(() => {
      setQueue((prev) => prev.filter((q) => q.status !== 'done'));
    }, 2000);
  }, []);

  const toggleChip = (val: string, list: string[], set: (v: string[]) => void) =>
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

  const filtered = items
    .filter((i) => {
      if (filterCat !== 'all' && i.category !== filterCat) return false;
      if (filterContexts.length > 0 && !filterContexts.some((c) => (i.context_tags as string[]).includes(c))) return false;
      if (filterSeasons.length > 0 && !filterSeasons.some((s) => (i.season_tags as string[]).includes(s))) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !i.name.toLowerCase().includes(q) &&
          !(i.color_primary || '').toLowerCase().includes(q) &&
          !(i.subcategory || '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':      return a.name.localeCompare(b.name);
        case 'formality-asc': return (a.formality || 3) - (b.formality || 3);
        case 'formality-desc': return (b.formality || 3) - (a.formality || 3);
        default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const stats = CATEGORIES.reduce((acc, c) => {
    acc[c] = items.filter((i) => i.category === c).length;
    return acc;
  }, {} as Record<string, number>);

  const topColors = Object.entries(
    items.reduce((acc, i) => { if (i.color_primary) acc[i.color_primary] = (acc[i.color_primary] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const formalityCounts = [1, 2, 3, 4, 5].map(f => items.filter(i => (i.formality || 3) === f).length);
  const maxFormality = Math.max(...formalityCounts, 1);

  const wornThisWeek = items.filter(i => i.days_since_worn != null && i.days_since_worn <= 7).length;
  const stale30 = items.filter(i => i.last_worn === null || (i.days_since_worn != null && i.days_since_worn > 30)).length;

  const missingCats = CATEGORIES.filter(c => stats[c] === 0);
  const topContext = Object.entries(
    items.reduce((acc, i) => { (i.context_tags || []).forEach(t => { acc[t] = (acc[t] || 0) + 1; }); return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])[0]?.[0];
  const insight = missingCats.length > 0
    ? `No ${missingCats.slice(0, 2).join(' · ')}`
    : topContext ? `${topContext}-heavy` : '';

  const activeQueue = queue.filter((q) => q.status !== 'done');

  return (
    <div className="min-h-screen p-3 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800 flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[2px] text-accent uppercase mb-0.5">
              // inventory.system
            </div>
            <div className="text-xl font-bold tracking-tight">
              WARDROBE.<span className="text-accent">LEDGER</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportCsv}
              className="bg-zinc-950 border border-zinc-800 text-zinc-50 px-3 py-2 text-[11px] tracking-wider uppercase rounded-sm flex items-center gap-1.5"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={lockOut}
              className="bg-zinc-950 border border-zinc-800 text-zinc-500 px-3 py-2 text-[11px] tracking-wider uppercase rounded-sm flex items-center gap-1.5"
            >
              <RotateCcw size={12} /> Lock
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 mb-4">
          <div className="bg-zinc-900 border border-accent/20 p-2.5 rounded-sm">
            <div className="text-[9px] tracking-wider text-accent uppercase">Total</div>
            <div className="text-2xl font-bold mt-0.5">{items.length}</div>
          </div>
          {CATEGORIES.map((c) => (
            <div key={c} className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-sm">
              <div className="text-[9px] tracking-wider text-zinc-500 uppercase">{c}</div>
              <div
                className={`text-2xl font-bold mt-0.5 ${
                  stats[c] > 0 ? 'text-zinc-50' : 'text-zinc-700'
                }`}
              >
                {stats[c]}
              </div>
            </div>
          ))}
        </div>

        {/* Analytics */}
        {items.length >= 5 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2.5 mb-4 flex flex-wrap gap-x-5 gap-y-2 items-center">
            <div className="flex gap-2.5 flex-wrap items-center">
              {topColors.map(([color, count]) => (
                <div key={color} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0" style={{ background: colorToCss(color) }} />
                  <span className="text-[11px] font-mono text-zinc-400">{color} <span className="text-zinc-600">{count}</span></span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-zinc-600 font-mono">gym</span>
              <div className="flex gap-0.5 items-end h-5">
                {formalityCounts.map((cnt, i) => (
                  <div
                    key={i}
                    title={['Gym', 'Casual', 'Smart casual', 'Business', 'Formal'][i] + ': ' + cnt}
                    style={{ height: `${Math.max((cnt / maxFormality) * 20, cnt > 0 ? 3 : 1)}px` }}
                    className={`w-3.5 rounded-sm ${cnt > 0 ? 'bg-accent/60' : 'bg-zinc-800'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">formal</span>
            </div>
            {insight && <span className="text-[11px] text-zinc-500 font-mono">{insight}</span>}
            <div className="flex gap-3 ml-auto shrink-0">
              <div className="text-center">
                <div className="text-[18px] font-bold leading-none">{wornThisWeek}</div>
                <div className="text-[9px] text-zinc-600 font-mono tracking-wider mt-0.5">this week</div>
              </div>
              <div className="text-center">
                <div className={`text-[18px] font-bold leading-none ${stale30 > 10 ? 'text-accent' : ''}`}>{stale30}</div>
                <div className="text-[9px] text-zinc-600 font-mono tracking-wider mt-0.5">stale 30d+</div>
              </div>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <DropZone onFiles={(files) => setPendingFiles(Array.from(files).filter(f => f.type.startsWith('image/')))} />

        {/* Hint input — shown after file selection, before processing */}
        {pendingFiles && pendingFiles.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <input
              type="text"
              placeholder={`Describe the item (optional) — helps AI classify better, e.g. "linen shirt, beige"`}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  processFiles(pendingFiles, hint);
                  setPendingFiles(null);
                  setHint('');
                }
              }}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-50 px-3 py-2 text-[12px] rounded-sm font-mono placeholder:text-zinc-600"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setPendingFiles(null); setHint(''); setRotation(0); }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-2 text-[11px] tracking-wider uppercase rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-2 rounded-sm"
                title="Rotate CCW"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-2 rounded-sm"
                title="Rotate CW"
              >
                <RotateCw size={13} />
              </button>
              {rotation !== 0 && (
                <span className="self-center text-[11px] text-accent font-mono">{rotation}°</span>
              )}
              <button
                onClick={() => {
                  processFiles(pendingFiles, hint, rotation);
                  setPendingFiles(null);
                  setHint('');
                  setRotation(0);
                }}
                className="flex-1 bg-accent text-zinc-950 px-3 py-2 text-[11px] font-bold tracking-wider uppercase rounded-sm"
              >
                Classify {pendingFiles.length} item{pendingFiles.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Queue */}
        {activeQueue.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-3 mb-4">
            <div className="text-[10px] tracking-[1.2px] uppercase text-accent mb-2 flex items-center gap-1.5">
              <Loader2 size={11} className="spin" />
              Processing · {activeQueue.length} pending
            </div>
            <div className="flex flex-col gap-1">
              {activeQueue.slice(0, 8).map((q) => (
                <div
                  key={q.id}
                  className={`text-[11px] flex justify-between gap-2 ${
                    q.status === 'error' ? 'text-red-400' : 'text-zinc-400'
                  }`}
                >
                  <span className="truncate">{q.filename}</span>
                  <span
                    className={`shrink-0 ${
                      q.status === 'error' ? 'text-red-400' : 'text-accent animate-pulse-soft'
                    }`}
                  >
                    {q.status === 'pending' && 'queued'}
                    {q.status === 'resizing' && 'resizing'}
                    {q.status === 'classifying' && 'classifying...'}
                    {q.status === 'error' && (q.error || 'failed')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        {items.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
              <input
                placeholder="search name, color, type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-50 pl-8 pr-3 py-2 text-[12px] rounded-sm font-mono"
              />
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-50 px-2.5 py-2 text-[12px] rounded-sm font-mono"
            >
              <option value="all">all categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-50 px-2.5 py-2 text-[12px] rounded-sm font-mono"
            >
              <option value="newest">newest first</option>
              <option value="oldest">oldest first</option>
              <option value="name">name A–Z</option>
              <option value="formality-asc">casual → formal</option>
              <option value="formality-desc">formal → casual</option>
            </select>
          </div>

          {/* Context + Season chips */}
          <div className="flex gap-1.5 flex-wrap">
            {CONTEXTS.map((c) => (
              <button
                key={c}
                onClick={() => toggleChip(c, filterContexts, setFilterContexts)}
                className={`px-2.5 py-1 text-[11px] rounded-sm border font-mono tracking-wide transition-colors ${
                  filterContexts.includes(c)
                    ? 'bg-accent text-zinc-950 border-accent'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                {c}
              </button>
            ))}
            <span className="self-center text-zinc-700 text-[10px] ml-1">·</span>
            {SEASONS.map((s) => (
              <button
                key={s}
                onClick={() => toggleChip(s, filterSeasons, setFilterSeasons)}
                className={`px-2.5 py-1 text-[11px] rounded-sm border font-mono tracking-wide transition-colors ${
                  filterSeasons.includes(s)
                    ? 'bg-accent text-zinc-950 border-accent'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                {s}
              </button>
            ))}
            {(filterContexts.length > 0 || filterSeasons.length > 0) && (
              <button
                onClick={() => { setFilterContexts([]); setFilterSeasons([]); }}
                className="px-2.5 py-1 text-[11px] rounded-sm border border-zinc-800 text-zinc-600 font-mono"
              >
                clear
              </button>
            )}
          </div>
          </div>
        )}

        {/* Item count */}
        {!loading && items.length > 0 && (
          <div className="text-[11px] text-zinc-600 font-mono mb-2">
            {filtered.length === items.length
              ? `${items.length} items`
              : `${filtered.length} of ${items.length} items`}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="p-10 text-center text-zinc-500 text-[12px]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-zinc-700 text-[12px] border border-dashed border-zinc-800 rounded-sm">
            {items.length === 0
              ? 'NO ITEMS YET. UPLOAD SOMETHING ABOVE.'
              : 'NO ITEMS MATCH YOUR FILTER.'}
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
          >
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={setEditing}
                onDelete={deleteItem}
                onStatusToggle={toggleStatus}
              />
            ))}
          </div>
        )}

        <div className="mt-7 pt-3 border-t border-zinc-800 text-[10px] text-zinc-700 text-center tracking-wider">
          POWERED BY GEMINI 2.5 FLASH · DATA IN SUPABASE
        </div>
      </div>

      {editing && (
        <ItemEditor
          item={editing}
          onClose={() => setEditing(null)}
          onSave={updateItem}
        />
      )}

      <ChatPanel />
    </div>
  );
}
