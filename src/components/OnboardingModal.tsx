import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';

interface OnboardingModalProps {
  userId: string;
  onComplete: (displayName: string) => void;
}

export default function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) return;
    setSaving(true);
    await (supabase as any).from('profiles').update({ display_name: trimmed }).eq('id', userId);
    onComplete(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-8 shadow-xl animate-fade-in space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Välkommen till LeadRadar!</h2>
          <p className="text-sm text-muted-foreground">Vad ska vi kalla dig?</p>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="T.ex. Erik, Säljteamet, Företagsnamn"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={100}
            autoFocus
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground">Detta visas i appen och för dina teammedlemmar.</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full h-11 text-base gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Kom igång
        </Button>
      </div>
    </div>
  );
}
