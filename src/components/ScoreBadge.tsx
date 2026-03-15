import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function ScoreBadge({ score, showTooltip = false }: { score: number; showTooltip?: boolean }) {
  const color =
    score >= 80 ? 'bg-emerald-500 text-white' :
    score >= 60 ? 'bg-amber-400 text-white' :
    score >= 40 ? 'bg-orange-400 text-white' :
    'bg-muted text-muted-foreground';

  const badge = (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[2.25rem] h-6 rounded-full text-[11px] font-bold px-2',
        color
      )}
    >
      {score}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <span className="inline-flex items-center gap-1">
      {badge}
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px]">
          Score baseras på registreringsdatum, kontaktinfo och bolagsform
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
