import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  f_tax_registered?: string;
  vat_registered?: string;
  employer_registered?: string;
}

function applyFilters(query: any, filters: WatchlistFilters) {
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.county) query = query.eq("county", filters.county);
  if (filters.industry_label) query = query.eq("industry_label", filters.industry_label);
  if (filters.company_form) query = query.eq("company_form", filters.company_form);
  if (filters.website_status) query = query.eq("website_status", filters.website_status);
  if (filters.phone_status) query = query.eq("phone_status", filters.phone_status);
  if (filters.registeredAfter) query = query.gte("registration_date", filters.registeredAfter);
  if (filters.registeredBefore) query = query.lte("registration_date", filters.registeredBefore);
  if (filters.f_tax_registered === "true") query = query.eq("f_tax_registered", true);
  if (filters.f_tax_registered === "false") query = query.eq("f_tax_registered", false);
  if (filters.vat_registered === "true") query = query.eq("vat_registered", true);
  if (filters.vat_registered === "false") query = query.eq("vat_registered", false);
  if (filters.employer_registered === "true") query = query.eq("employer_registered", true);
  if (filters.employer_registered === "false") query = query.eq("employer_registered", false);
  return query;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

function buildEmailHtml(watchlistName: string, leads: any[], appUrl: string): string {
  const leadRows = leads.map(l => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-weight:500;color:#1a1a1a">${l.company_name}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;color:#666">${l.industry_label || "–"}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;color:#666">${l.city || "–"}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;color:#666">${formatDate(l.registration_date)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0d9488,#14b8a6);padding:28px 24px;text-align:center">
        <h1 style="margin:0;color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px">⚡ LeadRadar</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Nya matchningar för din bevakning</p>
      </div>

      <!-- Content -->
      <div style="padding:24px">
        <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Bevakning</p>
        <h2 style="margin:0 0 20px;font-size:18px;color:#1a1a1a;font-weight:600">${watchlistName}</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#666">${leads.length} nya bolag matchar dina kriterier:</p>

        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#fafaf9">
              <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600">Bolag</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600">Bransch</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600">Stad</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600">Reg.datum</th>
            </tr>
          </thead>
          <tbody>${leadRows}</tbody>
        </table>

        <div style="text-align:center;margin:28px 0 8px">
          <a href="${appUrl}/leads" style="display:inline-block;background:#0d9488;color:white;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600">Visa leads i LeadRadar →</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:16px 24px;background:#fafaf9;border-top:1px solid #f0f0f0;text-align:center">
        <p style="margin:0;font-size:12px;color:#aaa">Du får detta mail för att du har en aktiv bevakning i LeadRadar.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get app URL for email links
    const appUrl = Deno.env.get("APP_URL") || "https://swede-leads-swift.lovable.app";

    // Fetch all watchlists with notifications enabled
    const { data: watchlists, error: wlError } = await supabase
      .from("saved_watchlists")
      .select("*, profiles!inner(email, notifications_enabled)")
      .eq("notify_enabled", true);

    if (wlError) throw wlError;
    if (!watchlists || watchlists.length === 0) {
      return new Response(
        JSON.stringify({ message: "No watchlists with notifications", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;

    for (const wl of watchlists) {
      const profile = (wl as any).profiles;
      // Skip if user has globally disabled notifications
      if (profile && !profile.notifications_enabled) continue;

      const email = wl.notification_email || profile?.email;
      if (!email) continue;

      const filters = (wl.filters_json || {}) as WatchlistFilters;

      // Find matching leads from last 24h
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      let query = supabase
        .from("companies")
        .select("id, company_name, industry_label, city, registration_date")
        .gte("created_at", oneDayAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      query = applyFilters(query, filters);
      const { data: leads, error: leadsErr } = await query;
      if (leadsErr) { console.error("Leads query error:", leadsErr); continue; }
      if (!leads || leads.length === 0) continue;

      // Filter out already-notified leads
      const leadIds = leads.map(l => l.id);
      const { data: alreadySent } = await supabase
        .from("notification_log")
        .select("lead_id")
        .eq("watchlist_id", wl.id)
        .in("lead_id", leadIds);

      const sentIds = new Set((alreadySent || []).map(r => r.lead_id));
      const newLeads = leads.filter(l => !sentIds.has(l.id));
      if (newLeads.length === 0) continue;

      // Send email via Resend
      const subject = `${newLeads.length} nya leads matchar "${wl.name}"`;
      const html = buildEmailHtml(wl.name, newLeads, appUrl);

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "LeadRadar <notifications@resend.dev>",
          to: [email],
          subject,
          html,
        }),
      });

      const resendData = await resendRes.json();
      const status = resendRes.ok ? "sent" : "failed";

      if (!resendRes.ok) {
        console.error(`Resend error for watchlist ${wl.id}:`, resendData);
      }

      // Log notifications
      const logEntries = newLeads.map(l => ({
        user_id: wl.user_id,
        watchlist_id: wl.id,
        lead_id: l.id,
        email_subject: subject,
        status,
      }));

      const { error: logErr } = await supabase
        .from("notification_log")
        .upsert(logEntries, { onConflict: "watchlist_id,lead_id" });

      if (logErr) console.error("Log insert error:", logErr);

      if (resendRes.ok) totalSent++;
    }

    return new Response(
      JSON.stringify({ message: "Notifications processed", sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-watchlist-notifications error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
