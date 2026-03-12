import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function getPlanTier(priceId: string): string {
  if (priceId === Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY")) return "starter";
  if (priceId === Deno.env.get("STRIPE_PRICE_PRO_MONTHLY")) return "pro";
  if (priceId === Deno.env.get("STRIPE_PRICE_ENTERPRISE_MONTHLY")) return "enterprise";
  return "starter";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-04-10",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signaturverifiering misslyckades:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[stripe-webhook] Event: ${event.type}`);

  function safeTimestamp(val: any): string | null {
    if (val == null) return null;
    const num = typeof val === "number" ? val : Number(val);
    if (isNaN(num) || num <= 0) return null;
    // Stripe sends seconds; if value looks like milliseconds already, use as-is
    const ms = num > 1e12 ? num : num * 1000;
    try { return new Date(ms).toISOString(); } catch { return null; }
  }

  try {
    switch (event.type) {

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();

        if (!profile) {
          console.error(`[stripe-webhook] No profile found for customer: ${sub.customer}`);
          break;
        }

        const priceId = sub.items.data[0]?.price?.id ?? "";

        const { error: upsertError } = await supabase.from("subscriptions").upsert({
          user_id: profile.id,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          plan_tier: getPlanTier(priceId),
          status: sub.status,
          current_period_start: safeTimestamp(sub.current_period_start),
          current_period_end: safeTimestamp(sub.current_period_end),
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          trial_end: safeTimestamp(sub.trial_end),
        }, { onConflict: "stripe_subscription_id" });

        if (upsertError) {
          console.error(`[stripe-webhook] Upsert error:`, upsertError);
        } else {
          console.log(`[stripe-webhook] Prenumeration uppdaterad: ${sub.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[stripe-webhook] Fel:", err);
    return new Response(JSON.stringify({ error: "Handler error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
