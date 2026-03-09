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

export async function createWatchlist(userId: string, name: string, filters: WatchlistFilters) {
  const { data, error } = await supabase
    .from('saved_watchlists')
    .insert({ user_id: userId, name: name.trim().slice(0, 100), filters_json: filters as any })
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

/** Count companies matching a watchlist's filters that were created in the last 7 days */
export async function fetchWatchlistMatchCount(filters: WatchlistFilters): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let query = supabase.from('companies').select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString());

  if (filters.city) query = query.eq('city', filters.city);
  if (filters.county) query = query.eq('county', filters.county);
  if (filters.industry_label) query = query.eq('industry_label', filters.industry_label);
  if (filters.company_form) query = query.eq('company_form', filters.company_form);
  if (filters.website_status) query = query.eq('website_status', filters.website_status as any);
  if (filters.phone_status) query = query.eq('phone_status', filters.phone_status as any);
  if (filters.registeredAfter) query = query.gte('registration_date', filters.registeredAfter);
  if (filters.registeredBefore) query = query.lte('registration_date', filters.registeredBefore);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Fetch matching companies for a watchlist */
export async function fetchWatchlistMatches(filters: WatchlistFilters, limit = 50) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let query = supabase.from('companies').select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.city) query = query.eq('city', filters.city);
  if (filters.county) query = query.eq('county', filters.county);
  if (filters.industry_label) query = query.eq('industry_label', filters.industry_label);
  if (filters.company_form) query = query.eq('company_form', filters.company_form);
  if (filters.website_status) query = query.eq('website_status', filters.website_status as any);
  if (filters.phone_status) query = query.eq('phone_status', filters.phone_status as any);
  if (filters.registeredAfter) query = query.gte('registration_date', filters.registeredAfter);
  if (filters.registeredBefore) query = query.lte('registration_date', filters.registeredBefore);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Fetch events matching a watchlist's event_type filter from last 7 days */
export async function fetchWatchlistEvents(filters: WatchlistFilters, limit = 30) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let query = supabase
    .from('company_events')
    .select('*, companies(id, company_name, city)')
    .gte('event_date', sevenDaysAgo.toISOString().split('T')[0])
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

/** Fetch recent alert runs for the current user's watchlists */
export async function fetchRecentAlertRuns(userId: string, limit = 10): Promise<AlertRunWithWatchlist[]> {
  // First get user's watchlist IDs
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

/** Fetch total alert matches from today for user's watchlists */
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

/** Trigger alert run manually */
export async function triggerAlertRun(): Promise<{ runs: number }> {
  const { data, error } = await supabase.functions.invoke('run-watchlist-alerts');
  if (error) throw error;
  return data;
}
