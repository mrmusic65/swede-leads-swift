import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LIMITS: Record<string, number> = {
  starter: 25,
  pro: 100,
  enterprise: -1, // unlimited
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Get user's plan
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_tier, status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const planTier = subscription?.plan_tier || "starter";
    const limit = PLAN_LIMITS[planTier] ?? 25;

    // Get current usage
    const { data: usage } = await supabase
      .from("search_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .single();

    const currentCount = usage?.count || 0;

    if (limit !== -1 && currentCount >= limit) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: "Du har använt alla dina sökningar för denna månad.",
          current: currentCount,
          limit,
          plan: planTier,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lead } = await req.json();
    if (!lead?.company_name) {
      return new Response(JSON.stringify({ error: "Missing lead data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search with Tavily
    const searchQueries = [
      `${lead.company_name} ${lead.city || ""}`,
      `${lead.company_name} recensioner omdömen`,
    ];

    const searchResults: string[] = [];

    for (const query of searchQueries) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            max_results: 5,
            search_depth: "basic",
          }),
        });

        if (tavilyRes.ok) {
          const tavilyData = await tavilyRes.json();
          for (const result of tavilyData.results || []) {
            searchResults.push(`Titel: ${result.title}\nURL: ${result.url}\nInnehåll: ${result.content}`);
          }
        }
      } catch (e) {
        console.error("Tavily search error for query:", query, e);
      }
    }

    const searchContext = searchResults.length > 0
      ? searchResults.join("\n\n---\n\n")
      : "Ingen specifik information hittades via webbsökning.";

    // Send to AI for summarization
    const systemPrompt = "Du är en säljcoach som ger konkreta, handlingsorienterade säljargument på svenska.";
    const userPrompt = `Du är en säljcoach. Baserat på följande information om "${lead.company_name}" som är ett ${lead.industry || "okänt"}-bolag i ${lead.city || "okänd stad"}, ge 4-5 konkreta säljargument som en säljare kan använda när de kontaktar bolaget. Fokusera på: svagheter eller möjligheter du hittar, om de saknar hemsida eller har dåliga recensioner, om de verkar växa eller nyanställa, hur länge de funnits och vad det signalerar. Håll varje punkt kort och handlingsorienterad.

Org.nummer: ${lead.org_number || "okänt"}

Webbsökningsresultat:
${searchContext}

Svara med exakt 4-5 numrerade punkter (1. 2. 3. etc). Inga andra kommentarer.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad, försök igen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Update search usage (upsert)
    if (usage?.id) {
      await supabase
        .from("search_usage")
        .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq("id", usage.id);
    } else {
      await supabase
        .from("search_usage")
        .insert({ user_id: userId, month: currentMonth, count: 1 });
    }

    return new Response(
      JSON.stringify({
        content,
        usage: { current: currentCount + 1, limit, plan: planTier },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("research-lead error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
