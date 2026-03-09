import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════
// Provider types & normalisation
// ═══════════════════════════════════════════════

/** Canonical shape every provider must return */
interface NormalizedCompany {
  company_name: string;
  org_number?: string;
  registration_date?: string;
  company_form?: string;
  sni_code?: string;
  industry_label?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  municipality?: string;
  county?: string;
  website_url?: string;
  phone_number?: string;
  source_primary?: string;
}

interface ProviderResult {
  companies: NormalizedCompany[];
}

interface DataProvider {
  name: string;
  fetch(): Promise<ProviderResult>;
}

// ═══════════════════════════════════════════════
// Providers
// ═══════════════════════════════════════════════

const placeholderProvider: DataProvider = {
  name: "placeholder",
  async fetch() {
    console.log("[provider:placeholder] No external API configured – returning empty.");
    return { companies: [] };
  },
};

const bolagsverketProvider: DataProvider = {
  name: "bolagsverket",
  async fetch() {
    const apiKey = Deno.env.get("BOLAGSVERKET_API_KEY");
    if (!apiKey) {
      console.log("[provider:bolagsverket] API key not configured – skipping.");
      return { companies: [] };
    }
    // TODO: Implement actual API call
    // const res = await fetch("https://api.bolagsverket.se/v1/new-registrations", {
    //   headers: { Authorization: `Bearer ${apiKey}` },
    // });
    // const raw = await res.json();
    // return { companies: raw.map(normalizeBolagsverket) };
    return { companies: [] };
  },
};

const scbProvider: DataProvider = {
  name: "scb",
  async fetch() {
    const apiKey = Deno.env.get("SCB_API_KEY");
    if (!apiKey) {
      console.log("[provider:scb] API key not configured – skipping.");
      return { companies: [] };
    }
    // TODO: Implement actual SCB API call
    return { companies: [] };
  },
};

// Registry – add new providers here
const PROVIDERS: DataProvider[] = [
  bolagsverketProvider,
  scbProvider,
  placeholderProvider,
];

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function detectWebsiteStatus(url?: string | null): string {
  if (!url || url.trim() === "") return "no_website_found";
  const lower = url.toLowerCase();
  const socialDomains = ["facebook.com", "instagram.com", "linktr.ee", "bokadirekt.se"];
  if (socialDomains.some((d) => lower.includes(d))) return "social_only";
  return "has_website";
}

function detectPhoneStatus(phone?: string | null): string {
  if (!phone || phone.trim() === "") return "missing";
  return "has_phone";
}

// ═══════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Optionally accept a specific provider name via body
  let requestedProvider: string | null = null;
  try {
    const body = await req.json();
    requestedProvider = body?.provider ?? null;
  } catch { /* no body or not json – run all */ }

  const providersToRun = requestedProvider
    ? PROVIDERS.filter((p) => p.name === requestedProvider)
    : PROVIDERS;

  const perProviderResults: Record<string, { fetched: number; imported: number; duplicates: number; skipped: number; error?: string }> = {};
  let totalImported = 0;
  let totalDuplicates = 0;
  let totalSkipped = 0;
  let totalFetched = 0;

  for (const provider of providersToRun) {
    let provImported = 0;
    let provDuplicates = 0;
    let provSkipped = 0;
    let provFetched = 0;
    let provError: string | undefined;

    try {
      const result = await provider.fetch();
      const companies = result.companies;
      provFetched = companies.length;

      for (const company of companies) {
        if (!company.company_name) {
          provSkipped++;
          continue;
        }

        // Dedup: org_number first, fallback company_name + city
        let isDuplicate = false;
        if (company.org_number) {
          const { data: existing } = await supabase
            .from("companies")
            .select("id")
            .eq("org_number", company.org_number)
            .limit(1);
          if (existing && existing.length > 0) isDuplicate = true;
        } else {
          let q = supabase.from("companies").select("id").eq("company_name", company.company_name);
          if (company.city) q = q.eq("city", company.city);
          const { data: existing } = await q.limit(1);
          if (existing && existing.length > 0) isDuplicate = true;
        }

        if (isDuplicate) {
          provDuplicates++;
          continue;
        }

        const { error } = await supabase.from("companies").insert({
          company_name: company.company_name,
          org_number: company.org_number || `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          registration_date: company.registration_date || null,
          company_form: company.company_form || null,
          sni_code: company.sni_code || null,
          industry_label: company.industry_label || null,
          address: company.address || null,
          postal_code: company.postal_code || null,
          city: company.city || null,
          municipality: company.municipality || null,
          county: company.county || null,
          website_url: company.website_url || null,
          website_status: detectWebsiteStatus(company.website_url),
          phone_number: company.phone_number || null,
          phone_status: detectPhoneStatus(company.phone_number),
          source_primary: company.source_primary || "daily-import",
          source_provider: provider.name,
        });

        if (error) {
          console.error(`[daily-import][${provider.name}] Insert error for ${company.company_name}:`, error.message);
          provSkipped++;
        } else {
          provImported++;
        }
      }
    } catch (err) {
      provError = String(err);
      console.error(`[daily-import][${provider.name}] Error:`, err);
    }

    perProviderResults[provider.name] = {
      fetched: provFetched,
      imported: provImported,
      duplicates: provDuplicates,
      skipped: provSkipped,
      error: provError,
    };

    totalFetched += provFetched;
    totalImported += provImported;
    totalDuplicates += provDuplicates;
    totalSkipped += provSkipped;

    // Log per provider
    await supabase.from("imports").insert({
      file_name: `daily-import-${provider.name}-${new Date().toISOString().split("T")[0]}`,
      user_id: "00000000-0000-0000-0000-000000000000",
      imported_rows: provImported,
      fetched_rows: provFetched,
      skipped_rows: provSkipped,
      duplicate_rows: provDuplicates,
      status: provError ? "failed" : "completed",
      source_name: provider.name,
      error_message: provError || null,
    }).then(({ error }) => {
      if (error) console.error(`[daily-import] Failed to log import for ${provider.name}:`, error.message);
    });
  }

  const response = {
    success: true,
    total: totalFetched,
    imported: totalImported,
    duplicates: totalDuplicates,
    skipped: totalSkipped,
    providers: perProviderResults,
  };

  console.log("[daily-import] Result:", JSON.stringify(response));

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
