'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';

function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Wrong password');
        setLoading(false);
        return;
      }
      router.replace(next);
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm bg-accent-dim border border-accent-edge mb-4">
            <Lock size={20} className="text-accent" />
          </div>
          <div className="text-xs tracking-[2px] uppercase text-accent mb-1">// access required</div>
          <div className="text-xl font-bold tracking-tight">
            WARDROBE.<span className="text-accent">LEDGER</span>
          </div>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="enter password"
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-50 px-3 py-3 text-sm rounded-sm font-mono"
        />

        {error && (
          <div className="mt-3 text-xs text-red-400 text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full mt-3 bg-accent text-zinc-950 font-semibold py-3 text-xs tracking-[1px] uppercase rounded-sm disabled:opacity-40"
        >
          {loading ? 'Verifying...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <UnlockForm />
    </Suspense>
  );
}
