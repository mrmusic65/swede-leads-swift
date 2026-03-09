import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WatchlistFilters {
  city?: string;
  county?: string;
  industry_label?: string;
  company_form?: string;
  website_status?: string;
  phone_status?: string;
  event_type?: string;
  registeredAfter?: string;
  registeredBefore?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all watchlists
    const { data: watchlists, error: wlError } = await supabase
      .from("saved_watchlists")
      .select("*");

    if (wlError) throw wlError;
    if (!watchlists || watchlists.length === 0) {
      return new Response(
        JSON.stringify({ message: "No watchlists to process", runs: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoISO = oneDayAgo.toISOString();
    const oneDayAgoDate = oneDayAgoISO.split("T")[0];

    let runsCreated = 0;

    for (const wl of watchlists) {
      const filters = (wl.filters_json || {}) as WatchlistFilters;

      // Count matching companies created in last 24h
      let companyQuery = supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneDayAgoISO);

      if (filters.city) companyQuery = companyQuery.eq("city", filters.city);
      if (filters.county) companyQuery = companyQuery.eq("county", filters.county);
      if (filters.industry_label) companyQuery = companyQuery.eq("industry_label", filters.industry_label);
      if (filters.company_form) companyQuery = companyQuery.eq("company_form", filters.company_form);
      if (filters.website_status) companyQuery = companyQuery.eq("website_status", filters.website_status);
      if (filters.phone_status) companyQuery = companyQuery.eq("phone_status", filters.phone_status);
      if (filters.registeredAfter) companyQuery = companyQuery.gte("registration_date", filters.registeredAfter);
      if (filters.registeredBefore) companyQuery = companyQuery.lte("registration_date", filters.registeredBefore);

      const { count: companyCount } = await companyQuery;

      // Count matching events in last 24h
      let eventCount = 0;
      if (filters.event_type) {
        const { count } = await supabase
          .from("company_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", filters.event_type)
          .gte("event_date", oneDayAgoDate);
        eventCount = count ?? 0;
      }

      const totalMatched = (companyCount ?? 0) + eventCount;

      // Insert alert run
      const { error: insertError } = await supabase
        .from("alert_runs")
        .insert({
          watchlist_id: wl.id,
          matched_count: totalMatched,
          run_timestamp: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`Failed to insert alert_run for watchlist ${wl.id}:`, insertError);
      } else {
        runsCreated++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Alert runs completed", runs: runsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("run-watchlist-alerts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
