import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ──────────────────────────────────────────────
// PLACEHOLDER: Replace this function with a real
// API call when you have access to an external
// data source (e.g. Bolagsverket, Allabolag, etc.)
// ──────────────────────────────────────────────
interface ExternalCompany {
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

async function fetchFromExternalAPI(): Promise<ExternalCompany[]> {
  // TODO: Replace with actual API call, e.g.:
  // const res = await fetch("https://api.bolagsverket.se/v1/new-registrations", {
  //   headers: { Authorization: `Bearer ${Deno.env.get("EXTERNAL_API_KEY")}` },
  // });
  // return await res.json();

  // Placeholder: return empty array (no-op until API is connected)
  console.log("[daily-import] No external API configured yet – returning empty placeholder.");
  return [];
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const companies = await fetchFromExternalAPI();

    if (companies.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No new companies from API", imported: 0, skipped: 0, duplicates: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let imported = 0;
    let duplicates = 0;
    let skipped = 0;

    for (const company of companies) {
      if (!company.company_name) {
        skipped++;
        continue;
      }

      // Check for duplicates: org_number first, fallback to company_name + city
      let isDuplicate = false;

      if (company.org_number) {
        const { data: existing } = await supabase
          .from("companies")
          .select("id")
          .eq("org_number", company.org_number)
          .limit(1);
        if (existing && existing.length > 0) isDuplicate = true;
      } else {
        // Fallback: company_name + city
        let q = supabase
          .from("companies")
          .select("id")
          .eq("company_name", company.company_name);
        if (company.city) q = q.eq("city", company.city);
        const { data: existing } = await q.limit(1);
        if (existing && existing.length > 0) isDuplicate = true;
      }

      if (isDuplicate) {
        duplicates++;
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
      });

      if (error) {
        console.error(`[daily-import] Insert error for ${company.company_name}:`, error.message);
        skipped++;
      } else {
        imported++;
      }
    }

    // Log import
    await supabase.from("imports").insert({
      file_name: `daily-import-${new Date().toISOString().split("T")[0]}`,
      user_id: "00000000-0000-0000-0000-000000000000",
      imported_rows: imported,
      status: "completed",
      source_name: "daily-import",
    }).then(({ error }) => {
      if (error) console.error("[daily-import] Failed to log import:", error.message);
    });

    const result = { success: true, imported, duplicates, skipped, total: companies.length };
    console.log("[daily-import] Result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[daily-import] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
