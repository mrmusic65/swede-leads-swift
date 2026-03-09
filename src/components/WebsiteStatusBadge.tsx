import { cn } from '@/lib/utils';
import type { WebsiteStatus } from '@/lib/mock-data';

const config: Record<WebsiteStatus, { label: string; className: string }> = {
  has_website: { label: 'Har hemsida', className: 'bg-success/15 text-success' },
  social_only: { label: 'Sociala medier', className: 'bg-warning/15 text-warning' },
  no_website_found: { label: 'Ingen hemsida', className: 'bg-destructive/15 text-destructive' },
  unknown: { label: 'Okänd', className: 'bg-muted text-muted-foreground' },
};

export default function WebsiteStatusBadge({ status }: { status: WebsiteStatus }) {
  const c = config[status];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', c.className)}>
      {c.label}
    </span>
  );
}
