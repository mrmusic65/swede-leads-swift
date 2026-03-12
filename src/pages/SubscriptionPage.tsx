import { useState, useEffect } from 'react';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  PLANS,
  fetchSubscription,
  startCheckout,
  openCustomerPortal,
  formatStatus,
  type Subscription,
  type PlanConfig,
} from '@/lib/subscription-api';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscription()
      .then(setSubscription)
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (planKey: string) => {
    try {
      setCheckoutLoading(planKey);
      await startCheckout(planKey);
    } catch (err: any) {
      toast({ title: 'Fel', description: err.message, variant: 'destructive' });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      setPortalLoading(true);
      await openCustomerPortal();
    } catch (err: any) {
      toast({ title: 'Fel', description: err.message, variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTier = subscription?.plan_tier;
  const status = subscription ? formatStatus(subscription.status) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prenumeration</h1>
        <p className="text-muted-foreground mt-1">Välj den plan som passar ditt behov</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Nuvarande plan</CardTitle>
              <Badge variant="outline" className={status?.color}>
                {status?.label}
              </Badge>
            </div>
            <CardDescription>
              {PLANS.find(p => p.tier === subscription.plan_tier)?.name ?? subscription.plan_tier}
              {subscription.cancel_at_period_end && (
                <span className="ml-2 text-yellow-600">· Avslutas vid periodens slut</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Hantera prenumeration
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan: PlanConfig) => {
          const isCurrent = activeTier === plan.tier;
          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col ${plan.highlighted ? 'border-primary shadow-md' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Populärast</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <p className="text-3xl font-bold mt-2">
                  {plan.price.toLocaleString('sv-SE')} <span className="text-sm font-normal text-muted-foreground">kr/mån</span>
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Nuvarande plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => handleCheckout(plan.key)}
                    disabled={!!checkoutLoading}
                  >
                    {checkoutLoading === plan.key && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {subscription ? 'Byt plan' : 'Starta 14 dagars test'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
