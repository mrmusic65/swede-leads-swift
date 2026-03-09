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

// Sanitize search input — strip characters that could break PostgREST filter syntax
function sanitizeSearch(input: string): string {
  return input.replace(/[%_'"\\(),.]/g, '').trim().slice(0, 100);
}

export async function fetchCompanies(filters: LeadFilters = {}) {
  const { page = 1, pageSize = 30, sortBy = 'created_at', sortDir = 'desc' } = filters;
  
  let query = supabase.from('companies').select('*', { count: 'exact' });

  if (filters.search) {
    const safe = sanitizeSearch(filters.search);
    if (safe) {
      query = query.or(`company_name.ilike.%${safe}%,city.ilike.%${safe}%,industry_label.ilike.%${safe}%,org_number.ilike.%${safe}%`);
    }
  }
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.county) query = query.eq('county', filters.county);
  if (filters.website_status) query = query.eq('website_status', filters.website_status as any);
  if (filters.phone_status) query = query.eq('phone_status', filters.phone_status as any);
  if (filters.industry_label) query = query.eq('industry_label', filters.industry_label);

  // Validate sortBy to prevent injection
  const allowedSorts = ['registration_date', 'company_name', 'created_at'] as const;
  const safeSortBy = allowedSorts.includes(sortBy as any) ? sortBy : 'created_at';

  const from = (page - 1) * pageSize;
  query = query.order(safeSortBy, { ascending: sortDir === 'asc' }).range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function fetchCompanyById(id: string) {
  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid company ID');
  }
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function fetchNotes(companyId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
    throw new Error('Invalid company ID');
  }
  const { data, error } = await supabase.from('notes').select('*').eq('company_id', companyId).order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addNote(companyId: string, userId: string, noteText: string) {
  const trimmed = noteText.trim().slice(0, 5000);
  if (!trimmed) throw new Error('Note text is required');
  const { data, error } = await supabase.from('notes').insert({ company_id: companyId, user_id: userId, note_text: trimmed }).select().single();
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

// CSV import is now handled via src/lib/import-api.ts → edge function

export async function exportCompaniesCSV(filters: LeadFilters = {}) {
  const { data } = await fetchCompanies({ ...filters, page: 1, pageSize: 10000 });
  
  const headers = ['company_name', 'org_number', 'registration_date', 'company_form', 'industry_label', 'address', 'postal_code', 'city', 'municipality', 'county', 'website_url', 'website_status', 'phone_number', 'phone_status', 'source_primary'];
  const csvRows = [headers.join(',')];
  
  data.forEach(c => {
    const row = headers.map(h => {
      const val = (c as any)[h];
      if (val == null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
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
