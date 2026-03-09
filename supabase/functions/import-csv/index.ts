import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_WEBSITE_STATUSES = ['has_website', 'social_only', 'no_website_found', 'unknown'];
const VALID_PHONE_STATUSES = ['has_phone', 'missing', 'unknown'];

const SOCIAL_DOMAINS = ['facebook.com', 'instagram.com', 'linktr.ee', 'bokadirekt.se'];

function detectWebsiteStatus(url: string | null | undefined): string {
  if (!url || !url.trim()) return 'no_website_found';
  const lower = url.toLowerCase();
  if (SOCIAL_DOMAINS.some(d => lower.includes(d))) return 'social_only';
  return 'has_website';
}

const DB_FIELDS = [
  'company_name', 'org_number', 'registration_date', 'company_form',
  'sni_code', 'industry_label', 'address', 'postal_code', 'city',
  'municipality', 'county', 'website_url', 'website_status',
  'phone_number', 'phone_status', 'source_primary',
] as const;

function sanitizeText(val: string | undefined | null, maxLen = 500): string | null {
  if (!val || typeof val !== 'string') return null;
  return val.trim().slice(0, maxLen) || null;
}

const FIELD_MAX_LENGTHS: Record<string, number> = {
  company_name: 300, org_number: 20, registration_date: 10,
  company_form: 50, sni_code: 20, industry_label: 200,
  address: 300, postal_code: 10, city: 100, municipality: 100,
  county: 100, website_url: 500, phone_number: 30, source_primary: 100,
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  const rows = lines.slice(1).map(line => {
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

  return { headers, rows };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action } = body;

    // ── ACTION: parse ── Returns CSV headers + preview rows for column mapping UI
    if (action === 'parse') {
      const { csv_text } = body;
      if (!csv_text || typeof csv_text !== 'string') {
        return new Response(JSON.stringify({ error: 'csv_text is required' }), { status: 400, headers: jsonHeaders });
      }
      if (csv_text.length > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Filen är för stor (max 5MB)' }), { status: 400, headers: jsonHeaders });
      }

      const { headers, rows } = parseCSV(csv_text);
      const preview = rows.slice(0, 5);
      const totalRows = rows.length;

      return new Response(JSON.stringify({ success: true, headers, preview, totalRows }), { headers: jsonHeaders });
    }

    // ── ACTION: import ── Performs mapped import with duplicate detection
    if (action === 'import') {
      const { csv_text, file_name, column_map } = body;

      if (!csv_text || typeof csv_text !== 'string') {
        return new Response(JSON.stringify({ error: 'csv_text is required' }), { status: 400, headers: jsonHeaders });
      }
      if (csv_text.length > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Filen är för stor (max 5MB)' }), { status: 400, headers: jsonHeaders });
      }
      if (!column_map || typeof column_map !== 'object') {
        return new Response(JSON.stringify({ error: 'column_map is required' }), { status: 400, headers: jsonHeaders });
      }

      const safeName = sanitizeText(file_name, 255) || 'import.csv';
      const { rows } = parseCSV(csv_text);

      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('imports')
        .insert({ user_id: userId, file_name: safeName, source_name: 'CSV', status: 'processing' })
        .select()
        .single();
      if (importError) {
        return new Response(JSON.stringify({ error: 'Kunde inte skapa importpost' }), { status: 500, headers: jsonHeaders });
      }

      // Map rows using column_map: { db_field: csv_header }
      const mapped: Record<string, any>[] = [];
      const skippedRows: number[] = [];

      for (let i = 0; i < rows.length; i++) {
        const csvRow = rows[i];
        const record: Record<string, any> = {};

        for (const dbField of DB_FIELDS) {
          const csvCol = column_map[dbField];
          if (!csvCol) continue;
          const rawVal = csvRow[csvCol];

          if (dbField === 'website_status') {
            record[dbField] = VALID_WEBSITE_STATUSES.includes(rawVal) ? rawVal : 'unknown';
          } else if (dbField === 'phone_status') {
            record[dbField] = VALID_PHONE_STATUSES.includes(rawVal) ? rawVal : 'unknown';
          } else {
            record[dbField] = sanitizeText(rawVal, FIELD_MAX_LENGTHS[dbField] || 500);
          }
        }

        // Validate required: company_name must exist
        if (!record.company_name) {
          skippedRows.push(i + 2); // +2 for 1-indexed + header row
          continue;
        }

        // Default values
        if (!record.website_status) record.website_status = 'unknown';
        if (!record.phone_status) record.phone_status = 'unknown';
        if (!record.source_primary) record.source_primary = 'CSV Import';

        mapped.push(record);
      }

      if (mapped.length === 0) {
        await supabase.from('imports').update({ status: 'failed', imported_rows: 0 }).eq('id', importRecord.id);
        return new Response(JSON.stringify({
          success: false,
          error: 'Inga giltiga rader hittades',
          total_rows: rows.length,
          imported: 0,
          skipped: skippedRows.length,
          duplicates: 0,
          skipped_rows: skippedRows.slice(0, 20),
        }), { status: 400, headers: jsonHeaders });
      }

      // ── Duplicate detection ──
      // Fetch existing org_numbers and company_name+city combos
      const orgNumbers = mapped.map(r => r.org_number).filter(Boolean);
      const existingOrgs = new Set<string>();
      const existingNameCity = new Set<string>();

      if (orgNumbers.length > 0) {
        const { data: existingByOrg } = await supabase
          .from('companies')
          .select('org_number, company_name, city')
          .in('org_number', orgNumbers);

        existingByOrg?.forEach(e => {
          if (e.org_number) existingOrgs.add(e.org_number);
        });
      }

      // For rows without org_number, check name+city
      const nameCityPairs = mapped
        .filter(r => !r.org_number && r.company_name)
        .map(r => r.company_name?.toLowerCase() + '||' + (r.city?.toLowerCase() || ''));

      if (nameCityPairs.length > 0) {
        const { data: existingByName } = await supabase
          .from('companies')
          .select('company_name, city');

        existingByName?.forEach(e => {
          if (e.company_name) {
            existingNameCity.add(e.company_name.toLowerCase() + '||' + (e.city?.toLowerCase() || ''));
          }
        });
      }

      const toInsert: Record<string, any>[] = [];
      const duplicateRows: number[] = [];

      for (let i = 0; i < mapped.length; i++) {
        const r = mapped[i];
        if (r.org_number && existingOrgs.has(r.org_number)) {
          duplicateRows.push(i + 2);
          continue;
        }
        if (!r.org_number && r.company_name) {
          const key = r.company_name.toLowerCase() + '||' + (r.city?.toLowerCase() || '');
          if (existingNameCity.has(key)) {
            duplicateRows.push(i + 2);
            continue;
          }
        }
        toInsert.push(r);
      }

      // Insert in batches
      let totalInserted = 0;
      const insertedIds: string[] = [];

      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        const { data: inserted, error: insertError } = await supabase
          .from('companies')
          .insert(batch)
          .select('id');

        if (insertError) {
          console.error('Batch insert error:', insertError);
          continue;
        }
        totalInserted += (inserted?.length || 0);
        inserted?.forEach(r => insertedIds.push(r.id));
      }

      const finalStatus = totalInserted > 0 ? 'completed' : 'failed';
      await supabase.from('imports').update({
        status: finalStatus,
        imported_rows: totalInserted,
      }).eq('id', importRecord.id);

      return new Response(JSON.stringify({
        success: totalInserted > 0,
        import_id: importRecord.id,
        total_rows: rows.length,
        imported: totalInserted,
        skipped: skippedRows.length,
        duplicates: duplicateRows.length,
        skipped_rows: skippedRows.slice(0, 20),
        duplicate_rows: duplicateRows.slice(0, 20),
        inserted_ids: insertedIds,
      }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "parse" or "import".' }), { status: 400, headers: jsonHeaders });
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
