'use client';

interface ChipProps {
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'muted' | 'success' | 'warn';
  onClick?: () => void;
}

export function Chip({ children, tone = 'default', onClick }: ChipProps) {
  const tones: Record<string, string> = {
    default: 'bg-zinc-800/60 border-zinc-700 text-zinc-300',
    accent: 'bg-accent-dim border-accent-edge text-accent',
    muted: 'bg-zinc-900 border-zinc-800 text-zinc-500',
    success: 'bg-emerald-950 border-emerald-900 text-emerald-400',
    warn: 'bg-accent-dim border-accent-edge text-accent',
  };
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-[2px] text-[10px] tracking-[0.4px] uppercase font-mono border rounded-sm whitespace-nowrap ${tones[tone]} ${onClick ? 'cursor-pointer select-none' : ''}`}
    >
      {children}
    </span>
  );
}
