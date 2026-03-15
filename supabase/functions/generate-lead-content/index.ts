import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, (lead: any) => string> = {
  call_script: (l) =>
    `Skriv ett kort kallsamtalsmanus på svenska (max 150 ord) anpassat för bolaget "${l.company_name}".
Bransch: ${l.industry || "okänd"}. Stad: ${l.city || "okänd"}.
Manuset ska ha tre tydliga delar:
1. **Öppning** – Presentera dig kort och förklara varför du ringer.
2. **Värdeproposition** – Beskriv ett generellt värde anpassat efter branschen utan att nämna en specifik produkt.
3. **Avslut** – Föreslå nästa steg, t.ex. boka ett kort möte.
Skriv bara manuset, inga extra kommentarer.`,

  sales_pitch: (l) =>
    `Skriv en generell säljpitch på svenska (max 200 ord) som kan användas av vilken säljare som helst oavsett vad de säljer.
Bolag: "${l.company_name}". Bransch: ${l.industry || "okänd"}. Stad: ${l.city || "okänd"}. Bolagsform: ${l.company_form || "okänd"}. Registreringsdatum: ${l.registration_date || "okänt"}.
Utgå från bolagets bransch, storlek och registreringsdatum för att göra den relevant och personlig. Skriv bara pitchen.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { lead, type } = await req.json();

    if (!lead || !type || !PROMPTS[type]) {
      return new Response(JSON.stringify({ error: "Invalid type or missing lead data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = PROMPTS[type](lead);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Du är en expert på B2B-försäljning i Sverige. Du skriver koncis, professionell och personlig text. Svara alltid på svenska.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Förfrågan begränsad, försök igen om en stund." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-krediter slut, vänligen fyll på." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-tjänsten svarade med ett fel." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lead-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
