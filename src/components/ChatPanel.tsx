'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer || data.error || 'No response' },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 w-12 h-12 bg-accent text-zinc-950 rounded-full flex items-center justify-center shadow-lg z-40"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 w-[min(380px,calc(100vw-2.5rem))] bg-zinc-900 border border-zinc-800 rounded-sm shadow-xl z-40 flex flex-col max-h-[70svh]">
          {/* Header */}
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

          {/* Messages */}
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
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-sm text-[12px] font-mono whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-accent text-zinc-950'
                      : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 px-3 py-2 rounded-sm">
                  <Loader2 size={13} className="text-accent animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about your wardrobe..."
              className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-50 px-3 py-2 text-[12px] rounded-sm font-mono placeholder:text-zinc-600"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="bg-accent text-zinc-950 px-3 py-2 rounded-sm disabled:opacity-40"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
