import { cn } from '@/lib/utils';

type LeadStatus = 'ny' | 'kontaktad' | 'kvalificerad' | 'ej_intressant';

const config: Record<LeadStatus, { label: string; className: string }> = {
  ny: { label: 'Ny', className: 'bg-primary/15 text-primary' },
  kontaktad: { label: 'Kontaktad', className: 'bg-warning/15 text-warning' },
  kvalificerad: { label: 'Kvalificerad', className: 'bg-success/15 text-success' },
  ej_intressant: { label: 'Ej intressant', className: 'bg-muted text-muted-foreground' },
};

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const c = config[status] ?? config.ny;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', c.className)}>
      {c.label}
    </span>
  );
}
