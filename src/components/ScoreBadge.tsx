import { cn } from '@/lib/utils';

export default function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500 text-white' :
    score >= 60 ? 'bg-amber-400 text-white' :
    score >= 40 ? 'bg-orange-400 text-white' :
    'bg-muted text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[2.25rem] h-6 rounded-full text-[11px] font-bold px-2',
        color
      )}
    >
      {score}
    </span>
  );
}
