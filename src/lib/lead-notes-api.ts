import { supabase } from '@/integrations/supabase/client';

export type NoteType = 'note' | 'call' | 'email' | 'meeting';

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  note_type: NoteType;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export type TimelineItem =
  | { kind: 'note'; data: LeadNote }
  | { kind: 'activity'; data: LeadActivity };

export async function fetchLeadNotes(leadId: string, limit = 20, offset = 0): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as LeadNote[];
}

export async function createLeadNote(leadId: string, userId: string, content: string, noteType: NoteType): Promise<LeadNote> {
  const trimmed = content.trim().slice(0, 5000);
  if (!trimmed) throw new Error('Content required');
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: leadId, user_id: userId, content: trimmed, note_type: noteType })
    .select()
    .single();
  if (error) throw error;
  return data as LeadNote;
}

export async function updateLeadNote(noteId: string, content: string): Promise<LeadNote> {
  const trimmed = content.trim().slice(0, 5000);
  if (!trimmed) throw new Error('Content required');
  const { data, error } = await supabase
    .from('lead_notes')
    .update({ content: trimmed })
    .eq('id', noteId)
    .select()
    .single();
  if (error) throw error;
  return data as LeadNote;
}

export async function deleteLeadNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
  if (error) throw error;
}

export async function fetchLeadActivity(leadId: string, limit = 20, offset = 0): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activity')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as LeadActivity[];
}

export async function logLeadActivity(leadId: string, userId: string, action: string, oldValue?: string | null, newValue?: string | null): Promise<void> {
  const { error } = await supabase
    .from('lead_activity')
    .insert({ lead_id: leadId, user_id: userId, action, old_value: oldValue ?? null, new_value: newValue ?? null });
  if (error) console.error('Activity log error:', error);
}

export async function fetchTimeline(leadId: string, limit = 20, offset = 0): Promise<{ items: TimelineItem[]; hasMore: boolean }> {
  const [notes, activities] = await Promise.all([
    fetchLeadNotes(leadId, limit, offset),
    fetchLeadActivity(leadId, limit, offset),
  ]);

  const items: TimelineItem[] = [
    ...notes.map(n => ({ kind: 'note' as const, data: n })),
    ...activities.map(a => ({ kind: 'activity' as const, data: a })),
  ];

  items.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

  const trimmed = items.slice(0, limit);
  return { items: trimmed, hasMore: notes.length === limit || activities.length === limit };
}

export async function fetchNotesTodayCount(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('lead_notes')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString());
  if (error) throw error;
  return count ?? 0;
}

export async function fetchLeadNoteCounts(leadIds: string[]): Promise<Record<string, number>> {
  if (leadIds.length === 0) return {};
  const { data, error } = await supabase
    .from('lead_notes')
    .select('lead_id')
    .in('lead_id', leadIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach(r => {
    counts[r.lead_id] = (counts[r.lead_id] || 0) + 1;
  });
  return counts;
}
