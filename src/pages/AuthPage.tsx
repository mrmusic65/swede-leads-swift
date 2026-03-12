import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, BarChart3, Users, TrendingUp, Bell, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ── Fake dashboard mockup ── */
function DashboardMockup() {
  return (
    <div className="w-full max-w-[520px] rounded-2xl shadow-2xl shadow-black/8 border border-black/[0.06] overflow-hidden" style={{ background: '#fff' }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.06]" style={{ background: '#fafaf8' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e2db' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e2db' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e2db' }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 rounded-md text-[10px] font-medium" style={{ background: '#efece6', color: '#8a8578' }}>
            app.leadradar.se/dashboard
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Nya leads', value: '847', icon: Users, trend: '+12%' },
            { label: 'Bevakningar', value: '6', icon: Bell, trend: 'aktiva' },
            { label: 'Score >70', value: '234', icon: TrendingUp, trend: '28%' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 border border-black/[0.05]" style={{ background: '#fafaf8' }}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-3.5 h-3.5" style={{ color: '#9a9488' }} />
                <span className="text-[9px] font-medium" style={{ color: '#2d9f8f' }}>{s.trend}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: '#2c2a25' }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: '#9a9488' }}>{s.label}</p>
            </div>
          ))}
        </div>
        {/* Chart placeholder */}
        <div className="rounded-xl border border-black/[0.05] p-4" style={{ background: '#fafaf8' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: '#2c2a25' }}>Leads per vecka</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px]" style={{ background: '#efece6', color: '#8a8578' }}>
              <Filter className="w-2.5 h-2.5" /> Filter
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {[35, 50, 42, 68, 55, 72, 60, 85, 78, 92, 88, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${h}%`,
                  background: i >= 10 ? '#2d9f8f' : i >= 8 ? '#5ec4b6' : '#ddd9d0',
                }}
              />
            ))}
          </div>
        </div>
        {/* Table rows */}
        <div className="rounded-xl border border-black/[0.05] overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[9px] font-semibold" style={{ background: '#fafaf8', color: '#9a9488' }}>
            <span>Företag</span><span>Bransch</span><span>Score</span><span>Status</span>
          </div>
          {[
            { name: 'Teknik Nord AB', industry: 'IT', score: 92, status: 'Ny' },
            { name: 'Bygg & Fasad', industry: 'Bygg', score: 78, status: 'Kontaktad' },
            { name: 'Grön Energi AB', industry: 'Energi', score: 85, status: 'Ny' },
          ].map((r) => (
            <div key={r.name} className="grid grid-cols-4 gap-2 px-3 py-2.5 border-t border-black/[0.04] text-[10px]" style={{ color: '#2c2a25' }}>
              <span className="font-medium truncate">{r.name}</span>
              <span style={{ color: '#9a9488' }}>{r.industry}</span>
              <span className="font-semibold" style={{ color: '#2d9f8f' }}>{r.score}</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-medium w-fit" style={{
                background: r.status === 'Ny' ? '#e8f5f2' : '#efece6',
                color: r.status === 'Ny' ? '#2d9f8f' : '#8a8578',
              }}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: 'E-post skickad', description: 'Kolla din inbox för en länk att återställa lösenordet.' });
        setIsForgot(false);
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: 'Konto skapat!', description: 'Kolla din e-post för att verifiera kontot.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F0E8' }}>
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2d9f8f' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: '#2c2a25' }}>LeadRadar</span>
        </div>
        <button
          onClick={() => { setIsSignUp(!isSignUp); setIsForgot(false); }}
          className="text-sm font-medium px-4 py-2 rounded-full border transition-colors"
          style={{ borderColor: '#d5d0c6', color: '#5c5850' }}
        >
          {isSignUp ? 'Logga in' : 'Skapa konto'}
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 lg:px-12 pb-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12 xl:gap-20">
          {/* Left — text + form */}
          <div className="w-full lg:w-1/2 max-w-md lg:max-w-none">
            {/* Hero text */}
            <h1
              className="text-[2.5rem] lg:text-[3.25rem] xl:text-[3.75rem] leading-[1.08] mb-5 font-serif"
              style={{ color: '#2c2a25', fontFamily: '"Georgia", "Times New Roman", serif' }}
            >
              {isForgot ? (
                'Återställ ditt lösenord'
              ) : (
                <>
                  Hitta dina nästa kunder{' '}
                  <span style={{ color: '#2d9f8f' }}>innan konkurrenterna</span>
                </>
              )}
            </h1>
            <p className="text-base lg:text-lg leading-relaxed mb-10 max-w-lg" style={{ color: '#8a8578' }}>
              {isForgot
                ? 'Ange din e-postadress så skickar vi en återställningslänk.'
                : 'LeadRadar levererar kvalificerade företagsleads automatiskt — varje dag, baserat på dina kriterier.'}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 max-w-sm">
              <input
                type="email"
                placeholder="E-postadress"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-full border text-sm outline-none transition-shadow focus:ring-2"
                style={{
                  background: '#fff',
                  borderColor: '#d5d0c6',
                  color: '#2c2a25',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#2d9f8f'}
                onBlur={e => e.currentTarget.style.borderColor = '#d5d0c6'}
              />
              {!isForgot && (
                <input
                  type="password"
                  placeholder="Lösenord"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-12 px-4 rounded-full border text-sm outline-none transition-shadow focus:ring-2"
                  style={{
                    background: '#fff',
                    borderColor: '#d5d0c6',
                    color: '#2c2a25',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#2d9f8f'}
                  onBlur={e => e.currentTarget.style.borderColor = '#d5d0c6'}
                />
              )}

              {!isSignUp && !isForgot && (
                <div className="flex justify-end pr-1">
                  <button
                    type="button"
                    onClick={() => setIsForgot(true)}
                    className="text-xs transition-colors"
                    style={{ color: '#9a9488' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#2d9f8f'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9a9488'}
                  >
                    Glömt lösenord?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#2d9f8f' }}
              >
                {loading
                  ? 'Vänta...'
                  : isForgot
                    ? 'Skicka återställningslänk'
                    : isSignUp
                      ? 'Kom igång — det är gratis'
                      : 'Logga in'}
              </button>
            </form>

            {/* Toggle / back */}
            <div className="mt-5 max-w-sm">
              {isForgot ? (
                <button
                  onClick={() => setIsForgot(false)}
                  className="text-sm transition-colors"
                  style={{ color: '#9a9488' }}
                >
                  ← Tillbaka till{' '}
                  <span className="font-medium" style={{ color: '#2d9f8f' }}>inloggning</span>
                </button>
              ) : (
                <p className="text-sm text-center" style={{ color: '#9a9488' }}>
                  {isSignUp ? 'Har du redan ett konto? ' : 'Inget konto ännu? '}
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="font-medium transition-colors"
                    style={{ color: '#2d9f8f' }}
                  >
                    {isSignUp ? 'Logga in' : 'Skapa ett gratis'}
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Right — app preview */}
          <div className="hidden lg:flex w-1/2 justify-center items-center">
            <DashboardMockup />
          </div>
        </div>
      </main>
    </div>
  );
}
