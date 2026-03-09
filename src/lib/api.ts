import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Company = Tables<'companies'>;
export type Note = Tables<'notes'>;
export type SavedFilter = Tables<'saved_filters'>;

const LOCAL_INDUSTRIES = [
  'Restaurang & Café', 'Bygg & Renovation', 'Frisör & Skönhet',
  'Städ & Facility', 'Hälsa & Träning', 'Bilverkstad & Motor',
  'Hemtjänst & Omsorg', 'Trädgård & Markarbete', 'El & VVS',
  'Flyttfirma', 'Målare & Tapetserare', 'Tandvård', 'Veterinär',
];

export function calculateLeadScore(c: Company): number {
  let score = 0;
  if (c.registration_date) {
    const days = Math.floor((Date.now() - new Date(c.registration_date).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 30) score += 40;
  }
  if (c.industry_label && LOCAL_INDUSTRIES.includes(c.industry_label)) score += 30;
  if (c.website_status === 'no_website_found') score += 25;
  else if (c.website_status === 'social_only') score += 15;
  if (c.phone_status === 'has_phone') score += 10;
  return Math.min(score, 100);
}

export interface LeadFilters {
  search?: string;
  city?: string;
  county?: string;
  website_status?: string;
  website_statuses?: string[];
  phone_status?: string;
  industry_label?: string;
  minScore?: number;
  maxScore?: number;
  registeredAfter?: string;
  registeredBefore?: string;
  sortBy?: 'registration_date' | 'company_name' | 'created_at' | 'lead_score';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

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
  if (filters.website_statuses && filters.website_statuses.length > 0) {
    query = query.in('website_status', filters.website_statuses as any);
  } else if (filters.website_status) {
    query = query.eq('website_status', filters.website_status as any);
  }
  if (filters.phone_status) query = query.eq('phone_status', filters.phone_status as any);
  if (filters.industry_label) query = query.eq('industry_label', filters.industry_label);
  if (filters.registeredAfter) query = query.gte('registration_date', filters.registeredAfter);
  if (filters.registeredBefore) query = query.lte('registration_date', filters.registeredBefore);

  // For lead_score sorting/filtering we need client-side processing
  const needsClientScore = sortBy === 'lead_score' || filters.minScore != null || filters.maxScore != null;

  if (needsClientScore) {
    // Fetch all matching rows, score client-side, then paginate
    const { data: allData, error } = await query;
    if (error) throw error;
    let scored = (allData ?? []).map(c => ({ ...c, _score: calculateLeadScore(c) }));

    if (filters.minScore != null) scored = scored.filter(c => c._score >= filters.minScore!);
    if (filters.maxScore != null) scored = scored.filter(c => c._score <= filters.maxScore!);

    if (sortBy === 'lead_score') {
      scored.sort((a, b) => sortDir === 'asc' ? a._score - b._score : b._score - a._score);
    } else {
      const allowedSorts = ['registration_date', 'company_name', 'created_at'] as const;
      const safeSortBy = allowedSorts.includes(sortBy as any) ? sortBy : 'created_at';
      scored.sort((a, b) => {
        const va = (a as any)[safeSortBy] ?? '';
        const vb = (b as any)[safeSortBy] ?? '';
        return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }

    const count = scored.length;
    const from = (page - 1) * pageSize;
    const data = scored.slice(from, from + pageSize);
    return { data, count };
  }

  const allowedSorts = ['registration_date', 'company_name', 'created_at'] as const;
  const safeSortBy = allowedSorts.includes(sortBy as any) ? sortBy : 'created_at';

  const from = (page - 1) * pageSize;
  query = query.order(safeSortBy, { ascending: sortDir === 'asc' }).range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function fetchCompanyById(id: string) {
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
  const today = new Date().toISOString().split('T')[0];

  const [allRes, newRes, noWebRes, socialRes, hasPhoneRes, newTodayRes, latestRes] = await Promise.all([
    supabase.from('companies').select('city, industry_label, website_status, phone_status, registration_date, company_name, id'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).gte('registration_date', thirtyDaysAgo.toISOString().split('T')[0]),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('website_status', 'no_website_found'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('website_status', 'social_only'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('phone_status', 'has_phone'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    supabase.from('companies').select('id, company_name, registration_date, city, industry_label').order('registration_date', { ascending: false }).limit(5),
  ]);

  const companies = allRes.data ?? [];

  const industryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const scored: { id: string; name: string; score: number }[] = [];

  companies.forEach(c => {
    if (c.industry_label) industryCounts[c.industry_label] = (industryCounts[c.industry_label] || 0) + 1;
    if (c.city) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
    const score = calculateLeadScore(c as Company);
    scored.push({ id: c.id, name: c.company_name, score });
  });

  scored.sort((a, b) => b.score - a.score);

  const topIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const topLeads = scored.slice(0, 5);
  const latestCompanies = (latestRes.data ?? []).map(c => ({
    id: c.id,
    name: c.company_name,
    registration_date: c.registration_date,
    city: c.city,
    industry_label: c.industry_label,
  }));

  return {
    newLast30: newRes.count ?? 0,
    noWebsite: noWebRes.count ?? 0,
    socialOnly: socialRes.count ?? 0,
    hasPhone: hasPhoneRes.count ?? 0,
    newToday: newTodayRes.count ?? 0,
    topIndustries,
    topCities,
    topLeads,
    latestCompanies,
  };
}

export async function fetchDistinctCities(): Promise<string[]> {
  const { data } = await supabase.from('companies').select('city').not('city', 'is', null);
  if (!data) return [];
  return [...new Set(data.map(d => d.city!))].sort();
}

export async function fetchDistinctCounties(): Promise<string[]> {
  const { data } = await supabase.from('companies').select('county').not('county', 'is', null);
  if (!data) return [];
  return [...new Set(data.map(d => d.county!))].sort();
}

export async function fetchDistinctIndustries(): Promise<string[]> {
  const { data } = await supabase.from('companies').select('industry_label').not('industry_label', 'is', null);
  if (!data) return [];
  return [...new Set(data.map(d => d.industry_label!))].sort();
}

// Saved filters
export async function fetchSavedFilters(userId: string): Promise<SavedFilter[]> {
  const { data, error } = await supabase.from('saved_filters').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSavedFilter(userId: string, name: string, filters: LeadFilters) {
  const { data, error } = await supabase.from('saved_filters').insert({
    user_id: userId,
    name: name.trim().slice(0, 100),
    filter_json: filters as any,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSavedFilter(id: string) {
  const { error } = await supabase.from('saved_filters').delete().eq('id', id);
  if (error) throw error;
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
