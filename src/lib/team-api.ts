import { supabase } from '@/integrations/supabase/client';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string | null;
  role: string;
  invited_email: string | null;
  status: string;
  created_at: string;
  // joined fields
  profile?: { full_name: string | null; email: string | null } | null;
}

export async function fetchUserTeam(): Promise<Team | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile?.team_id) return null;

  const { data } = await (supabase as any)
    .from('teams')
    .select('*')
    .eq('id', profile.team_id)
    .single();

  return data;
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data } = await (supabase as any)
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (!data) return [];

  // Fetch profiles for active members
  const userIds = data.filter((m: any) => m.user_id).map((m: any) => m.user_id);
  let profiles: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profs) {
      profs.forEach(p => { profiles[p.id] = { full_name: p.full_name, email: p.email }; });
    }
  }

  return data.map((m: any) => ({
    ...m,
    profile: m.user_id ? profiles[m.user_id] || null : null,
  }));
}

export async function sendTeamInvite(teamId: string, email: string, role: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-team-invite', {
    body: { email, teamId, role },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

export async function removeTeamMember(memberId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('team_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function updateTeamName(teamId: string, name: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('teams')
    .update({ name })
    .eq('id', teamId);

  if (error) throw error;
}

export const TEAM_MEMBER_LIMITS: Record<string, number> = {
  starter: 1,
  pro: 3,
  enterprise: 999,
};
