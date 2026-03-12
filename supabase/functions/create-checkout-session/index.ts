import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, { priceId: string; name: string }> = {
  starter_monthly: {
    priceId: Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY") ?? "",
    name: "Swede Leads Starter",
  },
  pro_monthly: {
    priceId: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") ?? "",
    name: "Swede Leads Pro",
  },
  enterprise_monthly: {
    priceId: Deno.env.get("STRIPE_PRICE_ENTERPRISE_MONTHLY") ?? "",
    name: "Swede Leads Enterprise",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Ingen autentisering");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Ogiltig session");

    const { planKey, successUrl, cancelUrl } = await req.json();
    const plan = PLANS[planKey];
    if (!plan) throw new Error(`Okänd plan: ${planKey}`);

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, full_name, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl ?? `${req.headers.get("origin")}/subscription/success`,
      cancel_url: cancelUrl ?? `${req.headers.get("origin")}/subscription`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id, plan: planKey },
      },
      allow_promotion_codes: true,
      locale: "sv",
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[create-checkout-session] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Okänt fel" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
