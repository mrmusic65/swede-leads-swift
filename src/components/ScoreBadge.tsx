import { cn } from '@/lib/utils';
import type { Enums } from '@/integrations/supabase/types';

export default function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-9 h-6 rounded-full text-xs font-semibold',
        score >= 70 ? 'bg-success/15 text-success' :
        score >= 40 ? 'bg-warning/15 text-warning' :
        'bg-muted text-muted-foreground'
      )}
    >
      {score}
    </span>
  );
}
