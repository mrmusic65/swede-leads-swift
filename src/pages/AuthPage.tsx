import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Shield, TrendingUp, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        o: Math.random() * 0.3 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45, 212, 191, ${p.o})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(45, 212, 191, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

const benefits = [
  { icon: TrendingUp, title: 'Hitta nya leads automatiskt', desc: 'Nyregistrerade företag levereras dagligen baserat på dina filter.' },
  { icon: Bell, title: 'Bevakningar & alerts', desc: 'Få notiser när nya företag matchar dina kriterier.' },
  { icon: Shield, title: 'Smart scoring', desc: 'Varje lead poängsätts för att prioritera dina bästa prospekt.' },
];

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
          email,
          password,
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

  const getHeading = () => {
    if (isForgot) return 'Återställ lösenord';
    if (isSignUp) return 'Skapa konto';
    return 'Välkommen tillbaka';
  };

  const getSubheading = () => {
    if (isForgot) return 'Ange din e-post så skickar vi en återställningslänk.';
    if (isSignUp) return 'Kom igång med LeadRadar på några sekunder.';
    return 'Logga in för att fortsätta till LeadRadar.';
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — dark hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0f0f0f 0%, #1a1a2e 50%, #0f2027 100%)' }}>
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-16 max-w-xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">LeadRadar</span>
          </div>

          {/* Hero text */}
          <h1 className="text-4xl xl:text-[2.75rem] font-bold text-white leading-[1.15] mb-5">
            Hitta dina nästa kunder{' '}
            <span className="bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-transparent">
              innan konkurrenterna
            </span>
          </h1>
          <p className="text-[15px] text-gray-400 leading-relaxed mb-10 max-w-md">
            LeadRadar skannar nya företagsregistreringar och levererar kvalificerade leads direkt till din inbox — automatiskt, varje dag.
          </p>

          {/* Benefits */}
          <div className="space-y-5">
            {benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <b.icon className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{b.title}</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">LeadRadar</span>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-5">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1.5">
              {isSignUp ? 'Skapa konto' : 'Välkommen tillbaka'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Kom igång med LeadRadar på några sekunder.' : 'Logga in för att fortsätta till LeadRadar.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-postadress</label>
              <Input
                type="email"
                placeholder="namn@företag.se"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl bg-background border-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Lösenord</label>
              <Input
                type="password"
                placeholder="Minst 8 tecken"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl bg-background border-input"
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold mt-2" disabled={loading}>
              {loading ? 'Vänta...' : isSignUp ? 'Skapa konto' : 'Logga in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? 'Har du redan ett konto? ' : 'Inget konto ännu? '}
              <span className="font-medium text-primary">{isSignUp ? 'Logga in' : 'Skapa ett'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
