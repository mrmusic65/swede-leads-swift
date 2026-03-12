import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DashboardMockup from '@/components/landing/DashboardMockup';
import HowItWorks from '@/components/landing/HowItWorks';
import Benefits from '@/components/landing/Benefits';
import Pricing from '@/components/landing/Pricing';
import CtaBanner from '@/components/landing/CtaBanner';
import Footer from '@/components/landing/Footer';
import UseCases from '@/components/landing/UseCases';
import ConcreteAdvantages from '@/components/landing/ConcreteAdvantages';
import Faq from '@/components/landing/Faq';
import ContactForm from '@/components/landing/ContactForm';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const scrollToForm = () => {
    setIsSignUp(true);
    setIsForgot(false);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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
      {/* Sticky navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 border-b" style={{ background: '#F5F0E8', borderColor: '#e5e2db' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2d9f8f' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: '#2c2a25' }}>LeadRadar</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsSignUp(false); setIsForgot(false); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
            className="text-sm font-medium px-4 py-2 rounded-full transition-colors hover:opacity-80"
            style={{ color: '#5c5850' }}
          >
            Logga in
          </button>
          <button
            onClick={scrollToForm}
            className="text-sm font-medium px-5 py-2 rounded-full text-white transition-colors hover:opacity-90"
            style={{ background: '#2d9f8f' }}
          >
            Skapa konto
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 xl:gap-20">
          {/* Left — text + form */}
          <div className="w-full lg:w-1/2 max-w-md lg:max-w-none">
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
                : 'LeadRadar levererar kvalificerade företagsleads automatiskt  varje dag, baserat på dina kriterier.'}
            </p>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5 max-w-sm">
              <input
                type="email"
                placeholder="E-postadress"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-full border text-sm outline-none transition-shadow focus:ring-2"
                style={{ background: '#fff', borderColor: '#d5d0c6', color: '#2c2a25', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
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
                  style={{ background: '#fff', borderColor: '#d5d0c6', color: '#2c2a25', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
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

            <div className="mt-5 max-w-sm">
              {isForgot ? (
                <button onClick={() => setIsForgot(false)} className="text-sm" style={{ color: '#9a9488' }}>
                  ← Tillbaka till <span className="font-medium" style={{ color: '#2d9f8f' }}>inloggning</span>
                </button>
              ) : (
                <p className="text-sm text-center" style={{ color: '#9a9488' }}>
                  {isSignUp ? 'Har du redan ett konto? ' : 'Inget konto ännu? '}
                  <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium" style={{ color: '#2d9f8f' }}>
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
      </section>

      {/* LANDING SECTIONS */}
      <HowItWorks />
      <Benefits />
      <Pricing onSignUp={scrollToForm} />
      <CtaBanner onSignUp={scrollToForm} />
      <Footer />
    </div>
  );
}
