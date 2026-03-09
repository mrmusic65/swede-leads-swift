import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_WEBSITE_STATUSES = ['has_website', 'social_only', 'no_website_found', 'unknown'];
const VALID_PHONE_STATUSES = ['has_phone', 'missing', 'unknown'];

function sanitizeText(val: string | undefined | null, maxLen = 500): string | null {
  if (!val || typeof val !== 'string') return null;
  return val.trim().slice(0, maxLen) || null;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { csv_text, file_name } = await req.json();

    if (!csv_text || typeof csv_text !== 'string') {
      return new Response(JSON.stringify({ error: 'csv_text is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Limit file size (5MB)
    if (csv_text.length > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const safeName = sanitizeText(file_name, 255) || 'import.csv';
    
    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('imports')
      .insert({ user_id: userId, file_name: safeName, source_name: 'CSV', status: 'processing' })
      .select()
      .single();

    if (importError) {
      return new Response(JSON.stringify({ error: 'Failed to create import record' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rows = parseCSV(csv_text);
    
    const mapped = rows.map(row => ({
      company_name: sanitizeText(row.company_name || row.namn, 300) || '',
      org_number: sanitizeText(row.org_number || row.organisationsnummer, 20) || '',
      registration_date: sanitizeText(row.registration_date || row.registreringsdatum, 10),
      company_form: sanitizeText(row.company_form || row.bolagsform, 50),
      sni_code: sanitizeText(row.sni_code || row.sni_kod, 20),
      industry_label: sanitizeText(row.industry_label || row.bransch, 200),
      address: sanitizeText(row.address || row.adress, 300),
      postal_code: sanitizeText(row.postal_code || row.postnummer, 10),
      city: sanitizeText(row.city || row.stad || row.ort, 100),
      municipality: sanitizeText(row.municipality || row.kommun, 100),
      county: sanitizeText(row.county || row.lan, 100),
      website_url: sanitizeText(row.website_url || row.hemsida, 500),
      website_status: VALID_WEBSITE_STATUSES.includes(row.website_status) ? row.website_status : 'unknown',
      phone_number: sanitizeText(row.phone_number || row.telefon, 30),
      phone_status: VALID_PHONE_STATUSES.includes(row.phone_status) ? row.phone_status : 'unknown',
      source_primary: sanitizeText(row.source_primary, 100) || 'CSV Import',
    })).filter(r => r.company_name && r.org_number);

    if (mapped.length === 0) {
      await supabase.from('imports').update({ status: 'failed', imported_rows: 0 }).eq('id', importRecord.id);
      return new Response(JSON.stringify({ error: 'No valid rows found', imported: 0 }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert in batches of 100
    let totalInserted = 0;
    for (let i = 0; i < mapped.length; i += 100) {
      const batch = mapped.slice(i, i + 100);
      const { error: insertError } = await supabase.from('companies').insert(batch);
      if (insertError) {
        console.error('Batch insert error:', insertError);
        continue;
      }
      totalInserted += batch.length;
    }

    await supabase.from('imports').update({
      status: totalInserted > 0 ? 'completed' : 'failed',
      imported_rows: totalInserted,
    }).eq('id', importRecord.id);

    return new Response(
      JSON.stringify({ success: true, imported: totalInserted, total_rows: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
