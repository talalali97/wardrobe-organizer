'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  CATEGORIES, PATTERNS, MATERIALS, WEIGHTS, FITS, SLEEVES,
  STATUSES, SEASONS, CONTEXTS, type Item, type Season, type Context
} from '@/lib/types';
import { Chip } from './Chip';

interface ItemEditorProps {
  item: Item;
  onClose: () => void;
  onSave: (item: Item) => Promise<void>;
}

export function ItemEditor({ item, onClose, onSave }: ItemEditorProps) {
  const [draft, setDraft] = useState<Item>(item);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(item), [item]);

  const update = <K extends keyof Item>(key: K, value: Item[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleSeason = (s: Season) =>
    setDraft((d) => ({
      ...d,
      season_tags: d.season_tags.includes(s)
        ? d.season_tags.filter((x) => x !== s)
        : [...d.season_tags, s],
    }));

  const toggleContext = (c: Context) =>
    setDraft((d) => ({
      ...d,
      context_tags: d.context_tags.includes(c)
        ? d.context_tags.filter((x) => x !== c)
        : [...d.context_tags, c],
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-zinc-950 border border-zinc-800 text-zinc-50 px-2.5 py-1.5 text-[13px] rounded-sm font-mono';

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3.5">
      <div className="text-[10px] tracking-[0.8px] uppercase text-zinc-500 mb-1.5">{label}</div>
      {children}
    </div>
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-sm w-full max-w-2xl max-h-[92vh] overflow-auto"
      >
        <div className="px-4 py-3.5 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-900 z-10">
          <div className="text-[11px] tracking-[1.2px] uppercase text-accent">
            EDIT ITEM // {draft.id.slice(-6)}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
          <div>
            {draft.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.image_url}
                alt={draft.name}
                className="w-full rounded-sm border border-zinc-800"
              />
            ) : (
              <div className="aspect-square bg-zinc-950 border border-zinc-800 rounded-sm flex items-center justify-center text-zinc-700 text-[10px] uppercase">
                no image
              </div>
            )}
            <div className="mt-2.5 text-[10px] text-zinc-500 tracking-wider">
              CONFIDENCE:{' '}
              <span
                className={
                  (draft.confidence || 0) >= 0.7 ? 'text-emerald-400' : 'text-accent'
                }
              >
                {((draft.confidence || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div>
            <Field label="Name">
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  className={inputClass}
                  value={draft.category}
                  onChange={(e) => update('category', e.target.value as any)}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Subcategory">
                <input
                  className={inputClass}
                  value={draft.subcategory || ''}
                  onChange={(e) => update('subcategory', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary color">
                <input
                  className={inputClass}
                  value={draft.color_primary || ''}
                  onChange={(e) => update('color_primary', e.target.value)}
                />
              </Field>
              <Field label="Secondary color">
                <input
                  className={inputClass}
                  value={draft.color_secondary || ''}
                  onChange={(e) => update('color_secondary', e.target.value || null)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Pattern">
                <select
                  className={inputClass}
                  value={draft.pattern || 'Solid'}
                  onChange={(e) => update('pattern', e.target.value as any)}
                >
                  {PATTERNS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Material">
                <select
                  className={inputClass}
                  value={draft.material_guess || 'Unknown'}
                  onChange={(e) => update('material_guess', e.target.value as any)}
                >
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Weight">
                <select
                  className={inputClass}
                  value={draft.weight || 'Medium'}
                  onChange={(e) => update('weight', e.target.value as any)}
                >
                  {WEIGHTS.map((w) => <option key={w}>{w}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Fit">
                <select
                  className={inputClass}
                  value={draft.fit || 'Unknown'}
                  onChange={(e) => update('fit', e.target.value as any)}
                >
                  {FITS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Sleeve">
                <select
                  className={inputClass}
                  value={draft.sleeve_length || 'N/A'}
                  onChange={(e) => update('sleeve_length', e.target.value as any)}
                >
                  {SLEEVES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Formality 1-5">
                <input
                  type="number"
                  min={1}
                  max={5}
                  className={inputClass}
                  value={draft.formality}
                  onChange={(e) => update('formality', parseInt(e.target.value) || 3)}
                />
              </Field>
              <Field label="Status">
                <select
                  className={inputClass}
                  value={draft.status}
                  onChange={(e) => update('status', e.target.value as any)}
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Seasons">
              <div className="flex flex-wrap gap-1.5">
                {SEASONS.map((s) => (
                  <Chip
                    key={s}
                    tone={draft.season_tags.includes(s) ? 'accent' : 'muted'}
                    onClick={() => toggleSeason(s)}
                  >
                    {s}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Contexts">
              <div className="flex flex-wrap gap-1.5">
                {CONTEXTS.map((c) => (
                  <Chip
                    key={c}
                    tone={draft.context_tags.includes(c) ? 'accent' : 'muted'}
                    onClick={() => toggleContext(c)}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Notes">
              <textarea
                className={`${inputClass} min-h-[60px] resize-y`}
                value={draft.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </Field>

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-accent text-zinc-950 font-semibold py-2.5 px-4 text-[11px] tracking-[1px] uppercase rounded-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                onClick={onClose}
                className="bg-zinc-950 border border-zinc-800 text-zinc-400 py-2.5 px-4 text-[11px] tracking-[1px] uppercase rounded-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
