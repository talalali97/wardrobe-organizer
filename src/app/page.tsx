'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, RotateCcw, Search, Loader2 } from 'lucide-react';
import { CATEGORIES, type Item } from '@/lib/types';
import { resizeToBase64, itemsToCsv } from '@/lib/image';
import { DropZone } from '@/components/DropZone';
import { ItemCard } from '@/components/ItemCard';
import { ItemEditor } from '@/components/ItemEditor';

interface QueueItem {
  id: string;
  filename: string;
  status: 'pending' | 'resizing' | 'classifying' | 'done' | 'error';
  error?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

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

  const processFiles = useCallback(async (files: File[], userHint?: string) => {
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
        resized = await resizeToBase64(file);
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

  const filtered = items
    .filter((i) => {
      if (filterCat !== 'all' && i.category !== filterCat) return false;
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

  const reviewCount = items.filter((i) => (i.confidence || 0) < 0.7).length;
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

        {reviewCount > 0 && (
          <div className="mb-3 text-[11px] text-accent">
            {reviewCount} item{reviewCount > 1 ? 's' : ''} flagged for review
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
                onClick={() => { setPendingFiles(null); setHint(''); }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-2 text-[11px] tracking-wider uppercase rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  processFiles(pendingFiles, hint);
                  setPendingFiles(null);
                  setHint('');
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
          <div className="flex gap-2 mb-3 flex-wrap items-center">
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
    </div>
  );
}
