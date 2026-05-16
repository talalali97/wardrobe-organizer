'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, CalendarCheck } from 'lucide-react';

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

function OutfitCardView({ outfit, onOutcome }: {
  outfit: OutfitCard;
  onOutcome: (id: string, outcome: 'worn' | 'skipped') => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleWore = async () => {
    setLoading(true);
    await Promise.all(
      outfit.item_ids.map((item_id) =>
        fetch('/api/wear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id }),
        })
      )
    );
    await fetch(`/api/outfits/${outfit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'worn' }),
    });
    onOutcome(outfit.id, 'worn');
    setLoading(false);
  };

  const handleSkip = async () => {
    setLoading(true);
    await fetch(`/api/outfits/${outfit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'skipped' }),
    });
    onOutcome(outfit.id, 'skipped');
    setLoading(false);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-2.5 mt-2">
      {outfit.context_label && (
        <div className="text-[10px] text-accent font-mono tracking-wider uppercase mb-2">
          {outfit.context_label}
        </div>
      )}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {outfit.items.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800 shrink-0">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[8px]">
                  {item.category[0]}
                </div>
              )}
            </div>
            <div className="text-[9px] text-zinc-600 font-mono w-14 truncate text-center">{item.name}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-zinc-400 font-mono mb-2.5 leading-relaxed">
        {outfit.reasoning}
      </div>
      {outfit.outcome ? (
        <div className={`text-[10px] font-mono tracking-wider ${outfit.outcome === 'worn' ? 'text-accent' : 'text-zinc-600'}`}>
          {outfit.outcome === 'worn' ? '✓ worn' : '— skipped'}
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={handleWore}
            disabled={loading}
            className="flex-1 bg-accent text-zinc-950 text-[10px] font-mono font-bold tracking-wider uppercase py-1.5 rounded-sm disabled:opacity-50"
          >
            wore this
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-mono tracking-wider uppercase py-1.5 rounded-sm disabled:opacity-50"
          >
            not today
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [planContext, setPlanContext] = useState('');
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
    const msg = planContext.trim()
      ? `${PLAN_TODAY_MSG} Context: ${planContext.trim()}`
      : PLAN_TODAY_MSG;
    setPlanContext('');
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

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 w-12 h-12 bg-accent text-zinc-950 rounded-full flex items-center justify-center shadow-lg z-40"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 w-[min(380px,calc(100vw-2.5rem))] bg-zinc-900 border border-zinc-800 rounded-sm shadow-xl z-40 flex flex-col max-h-[70svh]">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] tracking-[1.2px] uppercase text-accent">// wardrobe.ai</div>
              <div className="text-[12px] text-zinc-400 font-mono">Ask anything about your wardrobe</div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 font-mono uppercase tracking-wider"
              >
                clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 overscroll-contain">
            {messages.length === 0 && (
              <div className="text-zinc-600 text-[12px] font-mono text-center mt-4 flex flex-col gap-2">
                <div>Try asking:</div>
                {[
                  'How many t-shirts do I have?',
                  "What's missing from my wardrobe?",
                  'What can I wear to a wedding?',
                  'Show me casual summer outfits',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-zinc-500 hover:text-accent text-[11px] font-mono transition-colors"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-sm text-[12px] font-mono whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-accent text-zinc-950' : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  {m.content}
                </div>
                {m.outfits?.map((outfit) => (
                  <div key={outfit.id} className="w-full max-w-[92%]">
                    <OutfitCardView outfit={outfit} onOutcome={updateOutfitOutcome} />
                  </div>
                ))}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 px-3 py-2 rounded-sm flex items-center gap-2">
                  <Loader2 size={13} className="text-accent animate-spin" />
                  <span className="text-[11px] text-zinc-500 font-mono">thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Plan Today + input */}
          <div className="p-3 border-t border-zinc-800 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={planContext}
                onChange={(e) => setPlanContext(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && planToday()}
                placeholder="Today's context (optional)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-50 px-2.5 py-1.5 text-[11px] rounded-sm font-mono placeholder:text-zinc-700"
              />
              <button
                onClick={planToday}
                disabled={loading}
                title="Plan today's outfit"
                className="bg-zinc-800 border border-zinc-700 text-accent px-2.5 py-1.5 rounded-sm disabled:opacity-40 flex items-center gap-1.5 text-[11px] font-mono shrink-0"
              >
                <CalendarCheck size={12} /> Plan today
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about your wardrobe..."
                className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-50 px-3 py-2 text-[12px] rounded-sm font-mono placeholder:text-zinc-600"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="bg-accent text-zinc-950 px-3 py-2 rounded-sm disabled:opacity-40"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
