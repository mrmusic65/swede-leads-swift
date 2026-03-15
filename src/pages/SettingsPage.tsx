import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Shield, KeyRound, Loader2, Check, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  // Notification prefs
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultFrequency, setDefaultFrequency] = useState('instant');
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, notifications_enabled, default_notify_frequency')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
        if (data && 'notifications_enabled' in data) setNotificationsEnabled((data as any).notifications_enabled ?? true);
        if (data && 'default_notify_frequency' in data) setDefaultFrequency((data as any).default_notify_frequency ?? 'instant');
        setLoading(false);
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (error) {
      toast.error('Kunde inte spara profil');
    } else {
      toast.success('Profil uppdaterad');
    }
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSavingNotifs(true);
    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        notifications_enabled: notificationsEnabled,
        default_notify_frequency: defaultFrequency,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Kunde inte spara notifikationsinställningar');
    } else {
      toast.success('Notifikationsinställningar sparade');
    }
    setSavingNotifs(false);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error('Kunde inte skicka återställningslänk');
    } else {
      toast.success('Återställningslänk skickad till din email');
    }
    setResetSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inställningar</h1>
        <p className="text-sm text-muted-foreground mt-1">Hantera din profil och kontoinställningar</p>
      </div>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Profil
          </CardTitle>
          <CardDescription>Uppdatera ditt namn och profilinformation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              value={user?.email ?? ''}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">Din email kan inte ändras</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm">Fullständigt namn</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ange ditt namn"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} size="sm">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sparar...</>
            ) : (
              <><Check className="w-4 h-4 mr-1.5" /> Spara ändringar</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notification section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notifikationer
          </CardTitle>
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
                  <SelectTrigger className="w-full sm:w-60 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Direkt</SelectItem>
                    <SelectItem value="daily">Daglig sammanfattning</SelectItem>
                    <SelectItem value="weekly">Veckovis sammanfattning</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Välj hur ofta du vill få notiser som standard</p>
              </div>
            </>
          )}

          <Button onClick={handleSaveNotifications} disabled={savingNotifs} size="sm">
            {savingNotifs ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sparar...</>
            ) : (
              <><Check className="w-4 h-4 mr-1.5" /> Spara notifikationsinställningar</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Security section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Säkerhet
          </CardTitle>
          <CardDescription>Hantera lösenord och kontosäkerhet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Lösenord</p>
              <p className="text-xs text-muted-foreground mt-0.5">Skicka en återställningslänk till din email</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetPassword} disabled={resetSending}>
              {resetSending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Skickar...</>
              ) : (
                <><KeyRound className="w-4 h-4 mr-1.5" /> Byt lösenord</>
              )}
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
