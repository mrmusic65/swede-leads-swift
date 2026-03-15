import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type SavedWatchlist = Tables<'saved_watchlists'>;
export type AlertRun = Tables<'alert_runs'>;

export interface WatchlistFilters {
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

export async function fetchWatchlists(userId: string): Promise<SavedWatchlist[]> {
  const { data, error } = await supabase
    .from('saved_watchlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createWatchlist(
  userId: string,
  name: string,
  filters: WatchlistFilters,
  opts?: { notification_email?: string; notify_enabled?: boolean; notify_frequency?: string }
) {
  const { data, error } = await supabase
    .from('saved_watchlists')
    .insert({
      user_id: userId,
      name: name.trim().slice(0, 100),
      filters_json: filters as any,
      ...(opts?.notification_email !== undefined ? { notification_email: opts.notification_email } : {}),
      ...(opts?.notify_enabled !== undefined ? { notify_enabled: opts.notify_enabled } : {}),
      ...(opts?.notify_frequency !== undefined ? { notify_frequency: opts.notify_frequency } : {}),
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWatchlist(id: string) {
  const { error } = await supabase.from('saved_watchlists').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchWatchlistById(id: string): Promise<SavedWatchlist> {
  const { data, error } = await supabase.from('saved_watchlists').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

function applyCompanyFilters(query: any, filters: WatchlistFilters) {
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.county) query = query.eq('county', filters.county);
  if (filters.industry_label) query = query.eq('industry_label', filters.industry_label);
  if (filters.company_form) query = query.eq('company_form', filters.company_form);
  if (filters.website_status) query = query.eq('website_status', filters.website_status as any);
  if (filters.phone_status) query = query.eq('phone_status', filters.phone_status as any);
  if (filters.registeredAfter) query = query.gte('registration_date', filters.registeredAfter);
  if (filters.registeredBefore) query = query.lte('registration_date', filters.registeredBefore);
  if (filters.f_tax_registered === 'true') query = query.eq('f_tax_registered', true);
  if (filters.f_tax_registered === 'false') query = query.eq('f_tax_registered', false);
  if (filters.vat_registered === 'true') query = query.eq('vat_registered', true);
  if (filters.vat_registered === 'false') query = query.eq('vat_registered', false);
  if (filters.employer_registered === 'true') query = query.eq('employer_registered', true);
  if (filters.employer_registered === 'false') query = query.eq('employer_registered', false);
  return query;
}

/** Count companies matching filters created within a given number of days */
export async function fetchWatchlistMatchCountForDays(filters: WatchlistFilters, days: number): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase.from('companies').select('id', { count: 'exact', head: true })
    .gte('created_at', since.toISOString());

  query = applyCompanyFilters(query, filters);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Fetch match counts for 24h, 7d, 30d */
export async function fetchWatchlistMatchCounts(filters: WatchlistFilters): Promise<{ d1: number; d7: number; d30: number }> {
  const [d1, d7, d30] = await Promise.all([
    fetchWatchlistMatchCountForDays(filters, 1),
    fetchWatchlistMatchCountForDays(filters, 7),
    fetchWatchlistMatchCountForDays(filters, 30),
  ]);
  return { d1, d7, d30 };
}

/** Fetch matching companies for a watchlist */
export async function fetchWatchlistMatches(filters: WatchlistFilters, limit = 50) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase.from('companies').select('*')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  query = applyCompanyFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Fetch events matching a watchlist's event_type filter from last 30 days */
export async function fetchWatchlistEvents(filters: WatchlistFilters, limit = 50) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from('company_events')
    .select('*, companies(id, company_name, city)')
    .gte('event_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('event_date', { ascending: false })
    .limit(limit);

  if (filters.event_type) query = query.eq('event_type', filters.event_type as any);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ── Alert Runs API ──

export interface AlertRunWithWatchlist extends AlertRun {
  saved_watchlists?: { id: string; name: string } | null;
}

export async function fetchRecentAlertRuns(userId: string, limit = 10): Promise<AlertRunWithWatchlist[]> {
  const { data: watchlists } = await supabase
    .from('saved_watchlists')
    .select('id')
    .eq('user_id', userId);

  if (!watchlists || watchlists.length === 0) return [];

  const ids = watchlists.map(w => w.id);
  const { data, error } = await supabase
    .from('alert_runs')
    .select('*, saved_watchlists(id, name)')
    .in('watchlist_id', ids)
    .order('run_timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AlertRunWithWatchlist[];
}

export async function fetchTodayAlertSummary(userId: string): Promise<{ totalMatches: number; watchlistsWithMatches: number }> {
  const today = new Date().toISOString().split('T')[0];

  const { data: watchlists } = await supabase
    .from('saved_watchlists')
    .select('id')
    .eq('user_id', userId);

  if (!watchlists || watchlists.length === 0) return { totalMatches: 0, watchlistsWithMatches: 0 };

  const ids = watchlists.map(w => w.id);
  const { data, error } = await supabase
    .from('alert_runs')
    .select('matched_count, watchlist_id')
    .in('watchlist_id', ids)
    .gte('run_timestamp', `${today}T00:00:00`);

  if (error) throw error;
  const runs = data ?? [];
  const totalMatches = runs.reduce((sum, r) => sum + r.matched_count, 0);
  const watchlistsWithMatches = new Set(runs.filter(r => r.matched_count > 0).map(r => r.watchlist_id)).size;
  return { totalMatches, watchlistsWithMatches };
}

export async function triggerAlertRun(): Promise<{ runs: number }> {
  const { data, error } = await supabase.functions.invoke('run-watchlist-alerts');
  if (error) throw error;
  return data;
}
