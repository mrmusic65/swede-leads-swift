import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Fel', description: 'Lösenorden matchar inte.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Lösenord uppdaterat', description: 'Du kan nu logga in med ditt nya lösenord.' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground text-sm">Ogiltig eller utgången återställningslänk.</p>
            <Button variant="link" className="mt-2" onClick={() => navigate('/auth')}>
              Tillbaka till inloggning
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-2">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Nytt lösenord</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Ange ditt nya lösenord nedan.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nytt lösenord</label>
              <Input
                type="password"
                placeholder="Minst 8 tecken"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Bekräfta lösenord</label>
              <Input
                type="password"
                placeholder="Upprepa lösenordet"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold" disabled={loading}>
              {loading ? 'Vänta...' : 'Uppdatera lösenord'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
