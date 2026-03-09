import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Company = Tables<'companies'>;
export type Note = Tables<'notes'>;

export function calculateLeadScore(c: Company): number {
  let score = 0;
  if (c.registration_date) {
    const days = Math.floor((Date.now() - new Date(c.registration_date).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 30) score += 30;
    else if (days <= 60) score += 15;
  }
  if (c.website_status === 'no_website_found') score += 40;
  else if (c.website_status === 'social_only') score += 20;
  if (c.phone_status === 'has_phone') score += 15;
  const localIndustries = ['Restaurang & Café', 'Bygg & Renovation', 'Frisör & Skönhet', 'Städ & Facility', 'Hälsa & Träning'];
  if (c.industry_label && localIndustries.includes(c.industry_label)) score += 15;
  return Math.min(score, 100);
}

export interface LeadFilters {
  search?: string;
  city?: string;
  county?: string;
  website_status?: string;
  phone_status?: string;
  industry_label?: string;
  sortBy?: 'registration_date' | 'company_name' | 'created_at';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function fetchCompanies(filters: LeadFilters = {}) {
  const { page = 1, pageSize = 30, sortBy = 'created_at', sortDir = 'desc' } = filters;
  
  let query = supabase.from('companies').select('*', { count: 'exact' });

  if (filters.search) {
    query = query.or(`company_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,industry_label.ilike.%${filters.search}%,org_number.ilike.%${filters.search}%`);
  }
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.county) query = query.eq('county', filters.county);
  if (filters.website_status) query = query.eq('website_status', filters.website_status as any);
  if (filters.phone_status) query = query.eq('phone_status', filters.phone_status as any);
  if (filters.industry_label) query = query.eq('industry_label', filters.industry_label);

  const from = (page - 1) * pageSize;
  query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function fetchCompanyById(id: string) {
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function fetchNotes(companyId: string) {
  const { data, error } = await supabase.from('notes').select('*').eq('company_id', companyId).order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addNote(companyId: string, userId: string, noteText: string) {
  const { data, error } = await supabase.from('notes').insert({ company_id: companyId, user_id: userId, note_text: noteText }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchDashboardStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [allRes, newRes, noWebRes, socialRes] = await Promise.all([
    supabase.from('companies').select('city, industry_label, website_status, phone_status, registration_date'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).gte('registration_date', thirtyDaysAgo.toISOString().split('T')[0]),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('website_status', 'no_website_found'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('website_status', 'social_only'),
  ]);

  const companies = allRes.data ?? [];
  
  const industryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  let highestScore = 0;

  companies.forEach(c => {
    if (c.industry_label) industryCounts[c.industry_label] = (industryCounts[c.industry_label] || 0) + 1;
    if (c.city) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
    const score = calculateLeadScore(c as Company);
    if (score > highestScore) highestScore = score;
  });

  const topIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

  return {
    newLast30: newRes.count ?? 0,
    noWebsite: noWebRes.count ?? 0,
    socialOnly: socialRes.count ?? 0,
    highestScore,
    topIndustries,
    topCities,
  };
}

export async function fetchDistinctCities(): Promise<string[]> {
  const { data } = await supabase.from('companies').select('city').not('city', 'is', null);
  if (!data) return [];
  return [...new Set(data.map(d => d.city!))].sort();
}

export async function fetchDistinctIndustries(): Promise<string[]> {
  const { data } = await supabase.from('companies').select('industry_label').not('industry_label', 'is', null);
  if (!data) return [];
  return [...new Set(data.map(d => d.industry_label!))].sort();
}

export async function importCompaniesFromCSV(rows: Record<string, string>[], userId: string, fileName: string) {
  // Create import record
  const { data: importRecord, error: importError } = await supabase
    .from('imports')
    .insert({ user_id: userId, file_name: fileName, source_name: 'CSV', status: 'processing' as const })
    .select()
    .single();
  if (importError) throw importError;

  const mapped = rows.map(row => ({
    company_name: row.company_name || row.namn || '',
    org_number: row.org_number || row.organisationsnummer || '',
    registration_date: row.registration_date || row.registreringsdatum || null,
    company_form: row.company_form || row.bolagsform || null,
    sni_code: row.sni_code || row.sni_kod || null,
    industry_label: row.industry_label || row.bransch || null,
    address: row.address || row.adress || null,
    postal_code: row.postal_code || row.postnummer || null,
    city: row.city || row.stad || row.ort || null,
    municipality: row.municipality || row.kommun || null,
    county: row.county || row.lan || null,
    website_url: row.website_url || row.hemsida || null,
    website_status: (['has_website', 'social_only', 'no_website_found', 'unknown'].includes(row.website_status) ? row.website_status : 'unknown') as any,
    phone_number: row.phone_number || row.telefon || null,
    phone_status: (['has_phone', 'missing', 'unknown'].includes(row.phone_status) ? row.phone_status : 'unknown') as any,
    source_primary: row.source_primary || 'CSV Import',
  })).filter(r => r.company_name && r.org_number);

  const { error: insertError } = await supabase.from('companies').insert(mapped);
  
  await supabase.from('imports').update({
    status: insertError ? 'failed' as const : 'completed' as const,
    imported_rows: insertError ? 0 : mapped.length,
  }).eq('id', importRecord.id);

  if (insertError) throw insertError;
  return mapped.length;
}

export async function exportCompaniesCSV(filters: LeadFilters = {}) {
  const { data } = await fetchCompanies({ ...filters, page: 1, pageSize: 10000 });
  
  const headers = ['company_name', 'org_number', 'registration_date', 'company_form', 'industry_label', 'address', 'postal_code', 'city', 'municipality', 'county', 'website_url', 'website_status', 'phone_number', 'phone_status', 'source_primary'];
  const csvRows = [headers.join(',')];
  
  data.forEach(c => {
    const row = headers.map(h => {
      const val = (c as any)[h];
      if (val == null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    });
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
