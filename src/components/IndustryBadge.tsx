import { Badge } from '@/components/ui/badge';

const INDUSTRY_COLORS: Record<string, string> = {
  'IT & Tech': 'bg-blue-50 text-blue-700 border-blue-200/60',
  'Informations- och kommunikationsverksamhet': 'bg-blue-50 text-blue-700 border-blue-200/60',
  'Transport': 'bg-orange-50 text-orange-700 border-orange-200/60',
  'Transport och magasinering': 'bg-orange-50 text-orange-700 border-orange-200/60',
  'Bygg': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Byggverksamhet': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Handel': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Handel; reparation av motorfordon och motorcyklar': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Tillverkning': 'bg-amber-50 text-amber-700 border-amber-200/60',
  'Verksamhet inom juridik, ekonomi, vetenskap och teknik': 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  'Fastighetsverksamhet': 'bg-rose-50 text-rose-700 border-rose-200/60',
  'Hotell- och restaurangverksamhet': 'bg-pink-50 text-pink-700 border-pink-200/60',
  'Uthyrning, fastighetsservice, resetjänster och andra stödtjänster': 'bg-teal-50 text-teal-700 border-teal-200/60',
};

const DEFAULT_COLOR = 'bg-muted text-muted-foreground border-border/60';

export default function IndustryBadge({ industry }: { industry: string | null }) {
  if (!industry) return <span className="text-muted-foreground">–</span>;

  const colorClass = Object.entries(INDUSTRY_COLORS).find(
    ([key]) => industry.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(industry.toLowerCase())
  )?.[1] ?? DEFAULT_COLOR;

  return (
    <Badge variant="outline" className={`${colorClass} text-[11px] font-medium px-2 py-0.5 border whitespace-nowrap`}>
      {industry.length > 25 ? industry.slice(0, 22) + '…' : industry}
    </Badge>
  );
}
