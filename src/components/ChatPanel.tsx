'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, CalendarCheck, BarChart2, Plane } from 'lucide-react';

interface OutfitItem {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
}

interface OutfitCard {
  id: string;
  item_ids: string[];
  reasoning: string;
  context_label: string | null;
  outcome: 'worn' | 'skipped' | null;
  items: OutfitItem[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  outfits?: OutfitCard[];
}

const PLAN_TODAY_MSG = "Plan my outfit for today. Check the weather, look at what's clean, prefer items I haven't worn in 3+ days. Give me 2 options.";

const QUICK_ACTIONS = [
  { icon: CalendarCheck, label: "Plan today's outfit", msg: PLAN_TODAY_MSG },
  { icon: BarChart2,    label: 'Analyse my wardrobe', msg: "Give me an honest analysis of my wardrobe — gaps, duplicates, what's working and what's not." },
  { icon: Plane,        label: 'Help me pack for a trip', msg: "I need help packing for a trip. Ask me where I'm going and what I have planned." },
];

const QUICK_ASKS = [
  "What's my most worn item?",
  "What am I missing for office wear?",
  "Show me outfit ideas for going out",
];

function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="max-w-full max-h-full object-contain rounded-sm" onClick={(e) => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
        <X size={20} />
      </button>
    </div>
  );
}

function OutfitCardView({ outfit, onOutcome }: {
  outfit: OutfitCard;
  onOutcome: (id: string, outcome: 'worn' | 'skipped') => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);

  const handleWore = async () => {
    setActionLoading(true);
    try {
      await Promise.all(
        outfit.item_ids.map((item_id) =>
          fetch('/api/wear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id }) })
        )
      );
      await fetch(`/api/outfits/${outfit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: 'worn' }) });
      onOutcome(outfit.id, 'worn');
    } catch (e) {
      console.error('Failed to log wear:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/outfits/${outfit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: 'skipped' }) });
      onOutcome(outfit.id, 'skipped');
    } catch (e) {
      console.error('Failed to skip outfit:', e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {lightbox && <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)} />}
      <div className="mt-3 border-l-2 border-accent/30 pl-3 flex flex-col gap-3">
        {outfit.context_label && (
          <div className="text-[10px] text-accent font-mono tracking-widest uppercase">
            {outfit.context_label}
          </div>
        )}

        {/* Thumbnails — larger, horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mr-1 pr-1" style={{ scrollbarWidth: 'none' }}>
          {outfit.items.map((item) => (
            <div key={item.id} className="shrink-0 flex flex-col gap-1.5 items-center">
              <div
                className="w-[82px] h-[82px] bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800 cursor-pointer hover:border-accent/50 transition-colors"
                onClick={() => item.image_url && setLightbox({ src: item.image_url, name: item.name })}
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] font-mono uppercase">
                    {item.category[0]}
                  </div>
                )}
              </div>
              <div className="text-[9px] text-zinc-600 font-mono w-[82px] truncate text-center leading-tight">
                {item.name}
              </div>
            </div>
          ))}
        </div>

        {/* Reasoning */}
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">
          {outfit.reasoning}
        </p>

        {/* Actions */}
        {outfit.outcome ? (
          <div className={`text-[10px] font-mono tracking-wider ${outfit.outcome === 'worn' ? 'text-accent' : 'text-zinc-600'}`}>
            {outfit.outcome === 'worn' ? '✓ logged as worn' : '— skipped'}
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleWore}
              disabled={actionLoading}
              className="flex-1 bg-accent text-zinc-950 text-[11px] font-mono font-bold tracking-wider py-2 rounded-sm disabled:opacity-50 transition-opacity"
            >
              wore this
            </button>
            <button
              onClick={handleSkip}
              disabled={actionLoading}
              className="px-5 border border-zinc-700 text-zinc-500 text-[11px] font-mono tracking-wider py-2 rounded-sm disabled:opacity-50 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
            >
              skip
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  const send = async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? input).trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || data.error || 'No response',
          outfits: data.outfits?.length ? data.outfits : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const planToday = () => {
    const msg = input.trim()
      ? `${PLAN_TODAY_MSG} Context: ${input.trim()}`
      : PLAN_TODAY_MSG;
    setInput('');
    send(msg);
  };

  const updateOutfitOutcome = (outfitId: string, outcome: 'worn' | 'skipped') => {
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        outfits: m.outfits?.map((o) => (o.id === outfitId ? { ...o, outcome } : o)),
      }))
    );
  };

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* FAB — hidden on mobile when panel is open (panel is full-screen) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 w-12 h-12 bg-accent text-zinc-950 rounded-full flex items-center justify-center shadow-lg z-40 transition-transform active:scale-95 ${open ? 'hidden sm:flex' : 'flex'}`}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>

      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-5 sm:w-[420px] sm:max-h-[78svh] sm:rounded-sm bg-warm-950 sm:bg-warm-900 sm:border sm:border-warm-700 shadow-2xl z-40 flex flex-col">

          {/* Header */}
          <div className="px-4 py-3 sm:py-2.5 border-b border-warm-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[13px] sm:text-[11px] font-display font-medium text-zinc-300 sm:text-zinc-400">wardrobe.ai</span>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[11px] text-zinc-600 hover:text-zinc-400 font-mono uppercase tracking-wider transition-colors"
                >
                  clear
                </button>
              )}
              {/* Close button — visible on mobile only (desktop uses FAB) */}
              <button
                onClick={() => setOpen(false)}
                className="sm:hidden text-zinc-500 hover:text-zinc-200 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-4 flex flex-col gap-5 overscroll-contain">
            {messages.length === 0 && (
              <div className="flex flex-col gap-6 mt-2">
                <div className="flex flex-col gap-2.5">
                  {QUICK_ACTIONS.map(({ icon: Icon, label, msg }) => (
                    <button
                      key={label}
                      onClick={() => send(msg)}
                      disabled={loading}
                      className="flex items-center gap-3.5 px-4 py-3.5 sm:py-2.5 bg-warm-800 sm:bg-zinc-800 border border-warm-600 sm:border-zinc-700 hover:border-accent/40 rounded-sm text-left transition-colors disabled:opacity-40 group"
                    >
                      <Icon size={15} className="text-accent shrink-0" />
                      <span className="text-[14px] sm:text-[13px] font-display text-zinc-300 group-hover:text-zinc-100 transition-colors">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-[11px] text-zinc-700 font-mono uppercase tracking-wider">or ask anything</div>
                  {QUICK_ASKS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-[13px] sm:text-[12px] font-display text-zinc-600 hover:text-zinc-400 text-left transition-colors py-0.5"
                    >
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[78%] bg-accent text-zinc-950 px-4 py-2.5 rounded-sm text-[14px] sm:text-[13px] font-display font-medium whitespace-pre-wrap leading-snug">
                    {m.content}
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-1">
                    <div className="text-[15px] sm:text-[13px] font-display text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </div>
                    {m.outfits?.map((outfit) => (
                      <OutfitCardView key={outfit.id} outfit={outfit} onOutcome={updateOutfitOutcome} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5">
                <Loader2 size={13} className="text-accent animate-spin shrink-0" />
                <span className="text-[13px] font-display text-zinc-600">thinking...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input — extra bottom padding on mobile for home indicator */}
          <div className="px-3 pt-3 pb-6 sm:pb-3 border-t border-warm-700 flex items-center gap-2 shrink-0">
            <button
              onClick={planToday}
              disabled={loading}
              title={input.trim() ? `Plan today — with context: "${input}"` : "Plan today's outfit"}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-warm-800 sm:bg-zinc-800 border border-warm-600 sm:border-zinc-700 text-accent rounded-sm disabled:opacity-40 hover:border-accent/50 transition-colors shrink-0"
            >
              <CalendarCheck size={15} />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about your wardrobe..."
              className="flex-1 bg-warm-800 sm:bg-zinc-950 border border-warm-600 sm:border-zinc-800 focus:border-accent/50 text-zinc-50 px-4 py-2.5 sm:py-2 text-[15px] sm:text-[13px] rounded-sm font-display placeholder:text-zinc-600 outline-none transition-colors"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-accent text-zinc-950 rounded-sm disabled:opacity-40 transition-opacity shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
