import { supabase } from '@/integrations/supabase/client';

export type PlanTier = 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'paused';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
}

export interface PlanConfig {
  key: string;
  tier: PlanTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    key: 'starter_monthly',
    tier: 'starter',
    name: '🌱 Starter',
    price: 990,
    description: 'För dig som precis börjat prospektera',
    features: [
      'Upp till 100 leads/månad',
      'Filter på bransch & stad',
      'CSV-export',
      'E-postaviseringar',
    ],
  },
  {
    key: 'pro_monthly',
    tier: 'pro',
    name: '⚡ Pro',
    price: 2490,
    description: 'För säljteam som vill ligga steget före',
    features: [
      'Obegränsat antal leads',
      'Alla filter inkl. F-skatt & moms',
      'Watchlists & alerts',
      'API-access',
      'Prioriterad support',
    ],
    highlighted: true,
  },
  {
    key: 'enterprise_monthly',
    tier: 'enterprise',
    name: '🏢 Enterprise',
    price: 5990,
    description: 'För organisationer som lever på nya affärer',
    features: [
      'Allt i Pro',
      'Whitelabel-export',
      'Dedikerad account manager',
      'CRM-integration (HubSpot, Pipedrive)',
      'Anpassade datakällor',
      'SLA-garanti',
    ],
  },
];

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .select('*')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as Subscription;
}

export async function startCheckout(planKey: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Inte inloggad');

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      planKey,
      successUrl: `${window.location.origin}/subscription/success`,
      cancelUrl: `${window.location.origin}/subscription`,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.url) window.location.href = data.url;
}

export async function openCustomerPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('customer-portal', {
    body: { returnUrl: `${window.location.origin}/subscription` },
  });

  if (error) throw new Error(error.message);
  if (data?.url) window.location.href = data.url;
}

export function formatStatus(status: SubscriptionStatus): { label: string; color: string } {
  const map: Record<SubscriptionStatus, { label: string; color: string }> = {
    active: { label: 'Aktiv', color: 'text-green-600' },
    trialing: { label: 'Testperiod', color: 'text-primary' },
    past_due: { label: 'Betalning försenad', color: 'text-yellow-600' },
    canceled: { label: 'Avslutad', color: 'text-muted-foreground' },
    incomplete: { label: 'Ej slutförd', color: 'text-yellow-600' },
    paused: { label: 'Pausad', color: 'text-muted-foreground' },
  };
  return map[status] ?? { label: status, color: 'text-muted-foreground' };
}
