import { cn } from '@/lib/utils';
import type { Enums } from '@/integrations/supabase/types';

type PhoneStatus = Enums<'phone_status'>;

const config: Record<PhoneStatus, { label: string; className: string }> = {
  has_phone: { label: 'Har telefon', className: 'bg-success/15 text-success' },
  missing: { label: 'Saknas', className: 'bg-muted text-muted-foreground' },
  unknown: { label: 'Okänd', className: 'bg-muted text-muted-foreground' },
};

export default function PhoneStatusBadge({ status }: { status: PhoneStatus }) {
  const c = config[status];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', c.className)}>
      {c.label}
    </span>
  );
}
