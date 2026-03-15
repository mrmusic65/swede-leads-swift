import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserTeam, fetchTeamMembers, sendTeamInvite, removeTeamMember, updateTeamName, type Team, type TeamMember } from '@/lib/team-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Mail, Shield, KeyRound, Loader2, Check, Bell, Users, Trash2, Send, X, Crown, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const AVATAR_COLORS = ['bg-orange-600', 'bg-sky-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600', 'bg-teal-600', 'bg-indigo-600'];
function getColor(s: string) { return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length]; }

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  owner: { label: 'Ägare', variant: 'default' },
  admin: { label: 'Admin', variant: 'secondary' },
  member: { label: 'Medlem', variant: 'outline' },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultFrequency, setDefaultFrequency] = useState('instant');
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Team state
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [savingTeamName, setSavingTeamName] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('profiles').select('full_name, display_name, notifications_enabled, default_notify_frequency').eq('id', user.id).single()
      .then(({ data }: any) => {
        if (data?.full_name) setFullName(data.full_name);
        if (data?.display_name) setDisplayName(data.display_name);
        if (data) setNotificationsEnabled(data.notifications_enabled ?? true);
        if (data) setDefaultFrequency(data.default_notify_frequency ?? 'instant');
        setLoading(false);
      });
    loadTeam();
  }, [user]);

  const loadTeam = async () => {
    const t = await fetchUserTeam();
    setTeam(t);
    if (t) {
      setTeamName(t.name);
      const m = await fetchTeamMembers(t.id);
      setMembers(m);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    toast[error ? 'error' : 'success'](error ? 'Kunde inte spara profil' : 'Profil uppdaterad');
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSavingNotifs(true);
    const { error } = await (supabase as any).from('profiles').update({ notifications_enabled: notificationsEnabled, default_notify_frequency: defaultFrequency }).eq('id', user.id);
    toast[error ? 'error' : 'success'](error ? 'Kunde inte spara' : 'Notifikationsinställningar sparade');
    setSavingNotifs(false);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
    toast[error ? 'error' : 'success'](error ? 'Kunde inte skicka' : 'Återställningslänk skickad');
    setResetSending(false);
  };

  const handleInvite = async () => {
    if (!team || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await sendTeamInvite(team.id, inviteEmail.trim(), inviteRole);
      toast.success(`Inbjudan skickad till ${inviteEmail}`);
      setInviteEmail('');
      loadTeam();
    } catch (e: any) {
      toast.error(e.message === 'Already invited' ? 'Redan inbjuden' : 'Kunde inte skicka inbjudan');
    }
    setInviting(false);
  };

  const handleRemoveMember = async (member: TeamMember) => {
    try {
      await removeTeamMember(member.id);
      toast.success('Medlem borttagen');
      loadTeam();
    } catch { toast.error('Kunde inte ta bort'); }
  };

  const handleSaveTeamName = async () => {
    if (!team || !teamName.trim()) return;
    setSavingTeamName(true);
    try {
      await updateTeamName(team.id, teamName.trim());
      toast.success('Teamnamn uppdaterat');
      loadTeam();
    } catch { toast.error('Kunde inte uppdatera'); }
    setSavingTeamName(false);
  };

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingMembers = members.filter(m => m.status === 'pending');
  const isOwner = team?.owner_id === user?.id;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inställningar</h1>
        <p className="text-sm text-muted-foreground mt-1">Hantera din profil, team och kontoinställningar</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" />Profil</CardTitle>
          <CardDescription>Uppdatera ditt namn och profilinformation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />Email</Label>
            <Input id="email" value={user?.email ?? ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm">Fullständigt namn</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ange ditt namn" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} size="sm">
            {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Sparar...</> : <><Check className="w-4 h-4 mr-1.5" />Spara ändringar</>}
          </Button>
        </CardContent>
      </Card>

      {/* Team */}
      {team && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Team</CardTitle>
            <CardDescription>Hantera ditt team och bjud in kollegor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Team name */}
            {isOwner && (
              <div className="flex gap-2">
                <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Teamnamn" className="flex-1" />
                <Button size="sm" variant="outline" onClick={handleSaveTeamName} disabled={savingTeamName || teamName === team.name}>
                  {savingTeamName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Spara'}
                </Button>
              </div>
            )}

            <Separator />

            {/* Active members */}
            <div>
              <p className="text-sm font-medium mb-3">Medlemmar ({activeMembers.length})</p>
              <div className="space-y-2">
                {activeMembers.map(m => {
                  const email = m.profile?.email || m.invited_email || '';
                  const name = m.profile?.full_name || email.split('@')[0];
                  const initial = (name || '?')[0].toUpperCase();
                  const roleInfo = ROLE_LABELS[m.role] || ROLE_LABELS.member;
                  const isSelf = m.user_id === user?.id;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`w-8 h-8 rounded-full ${getColor(email)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {name}
                          {m.role === 'owner' && <Crown className="w-3 h-3 text-amber-500" />}
                          {isSelf && <span className="text-[10px] text-muted-foreground">(du)</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                      </div>
                      <Badge variant={roleInfo.variant} className="text-[10px]">{roleInfo.label}</Badge>
                      {isOwner && !isSelf && m.role !== 'owner' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ta bort medlem</AlertDialogTitle>
                              <AlertDialogDescription>Är du säker på att du vill ta bort {name} från teamet?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveMember(m)}>Ta bort</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending invites */}
            {pendingMembers.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3 text-muted-foreground">Väntande inbjudningar ({pendingMembers.length})</p>
                <div className="space-y-2">
                  {pendingMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-dashed border-border/60">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate">{m.invited_email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Väntande</Badge>
                      {isOwner && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(m)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite form */}
            {isOwner && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-primary" />Bjud in till teamet</p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="flex-1"
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    />
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Medlem</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} size="sm" className="gap-1.5">
                      {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Bjud in
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-primary" />Notifikationer</CardTitle>
          <CardDescription>Hantera e-postnotifikationer för bevakningar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">E-postnotifikationer</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aktivera eller inaktivera alla e-postnotiser globalt</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
          {notificationsEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm">Standardfrekvens</Label>
                <Select value={defaultFrequency} onValueChange={setDefaultFrequency}>
                  <SelectTrigger className="w-full sm:w-60 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Direkt</SelectItem>
                    <SelectItem value="daily">Daglig sammanfattning</SelectItem>
                    <SelectItem value="weekly">Veckovis sammanfattning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <Button onClick={handleSaveNotifications} disabled={savingNotifs} size="sm">
            {savingNotifs ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Sparar...</> : <><Check className="w-4 h-4 mr-1.5" />Spara</>}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Säkerhet</CardTitle>
          <CardDescription>Hantera lösenord och kontosäkerhet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Lösenord</p>
              <p className="text-xs text-muted-foreground mt-0.5">Skicka en återställningslänk till din email</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetPassword} disabled={resetSending}>
              {resetSending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Skickar...</> : <><KeyRound className="w-4 h-4 mr-1.5" />Byt lösenord</>}
            </Button>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Konto skapat</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }) : '–'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
