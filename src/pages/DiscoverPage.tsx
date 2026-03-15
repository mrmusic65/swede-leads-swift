import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchWatchlists, fetchWatchlistMatches, type SavedWatchlist } from '@/lib/watchlist-api';
import { calculateLeadScore, type Company } from '@/lib/api';
import { Sparkles, Search, Plus, ArrowRight, Building2, Truck, Cpu, Hammer, ShoppingBag, Utensils, Heart, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ScoreBadge from '@/components/ScoreBadge';

/* ── helpers ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'God natt';
  if (h < 12) return 'God morgon';
  if (h < 18) return 'God eftermiddag';
  return 'God kväll';
}


/* ── industry config ── */
const INDUSTRIES = [
  { label: 'IT & Tech', match: 'information', gradient: 'from-blue-600 to-blue-900', icon: Cpu },
  { label: 'Bygg & Fastighet', match: 'bygg', gradient: 'from-emerald-600 to-emerald-900', icon: Hammer },
  { label: 'Transport', match: 'transport', gradient: 'from-orange-600 to-orange-900', icon: Truck },
  { label: 'Handel', match: 'handel', gradient: 'from-purple-600 to-purple-900', icon: ShoppingBag },
  { label: 'Restaurang & Hotell', match: 'hotell', gradient: 'from-rose-600 to-rose-900', icon: Utensils },
  { label: 'Vård & Omsorg', match: 'vård', gradient: 'from-pink-600 to-pink-900', icon: Heart },
  { label: 'Konsult & Juridik', match: 'juridisk', gradient: 'from-indigo-600 to-indigo-900', icon: Briefcase },
  { label: 'Övriga', match: '', gradient: 'from-slate-600 to-slate-900', icon: Building2 },
];

function getIndustryConfig(label: string | null) {
  if (!label) return INDUSTRIES[INDUSTRIES.length - 1];
  const lower = label.toLowerCase();
  return INDUSTRIES.find(i => i.match && lower.includes(i.match)) || INDUSTRIES[INDUSTRIES.length - 1];
}

/* ── typewriter hook ── */
function useTypewriter(text: string, speed = 35) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

/* ── section wrapper ── */
function Section({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50 mb-4">{children}</h2>;
}

/* ── main ── */
export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [totalLeads, setTotalLeads] = useState(0);
  const [hotLeads, setHotLeads] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<SavedWatchlist[]>([]);
  const [watchlistMatches, setWatchlistMatches] = useState<Record<string, any[]>>({});
  const [industryCounts, setIndustryCounts] = useState<Record<string, number>>({});
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const subtitleText = useMemo(
    () => `Det finns ${totalLeads} svenska bolag redo att kontaktas.`,
    [totalLeads]
  );
  const typedSubtitle = useTypewriter(loading ? '' : subtitleText);

  // Keyboard shortcut ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('discover-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      (supabase as any).from('profiles').select('display_name, full_name').eq('id', user.id).single(),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('companies').select('id, company_name, pipeline_stage, city, industry_label').order('updated_at', { ascending: false }).limit(4),
      fetchWatchlists(user.id),
    ]).then(async ([profileRes, countRes, hotRes, recentRes, wls]) => {
      const p = (profileRes as any).data;
      setDisplayName(p?.display_name || p?.full_name?.split(' ')[0] || '');
      setTotalLeads(countRes.count ?? 0);

      const companies = hotRes.data ?? [];
      // Sort by score, take top 3
      const scored = companies.map((c: any) => ({ ...c, _score: calculateLeadScore(c as Company) }));
      scored.sort((a: any, b: any) => b._score - a._score);
      setHotLeads(scored.slice(0, 3));

      setRecentLeads(recentRes.data ?? []);
      setWatchlists(wls);

      // Industry counts
      const counts: Record<string, number> = {};
      const { data: allIndustries } = await supabase.from('companies').select('industry_label');
      (allIndustries ?? []).forEach((c: any) => {
        const cfg = getIndustryConfig(c.industry_label);
        counts[cfg.label] = (counts[cfg.label] || 0) + 1;
      });
      setIndustryCounts(counts);

      // Watchlist matches (first 3 per watchlist, max 5 watchlists)
      const matchMap: Record<string, any[]> = {};
      await Promise.all(
        wls.slice(0, 5).map(async (w) => {
          try {
            const matches = await fetchWatchlistMatches(w.filters_json as any, 3);
            matchMap[w.id] = matches;
          } catch { matchMap[w.id] = []; }
        })
      );
      setWatchlistMatches(matchMap);
      setLoading(false);
    });
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const stageLabels: Record<string, string> = {
    ny: 'Ny', kontakt: 'Kontakt', kvalificerad: 'Kvalificerad', kund: 'Kund',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Sparkles className="w-8 h-8 text-[hsl(172,66%,50%)]" />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-auto"
      style={{
        background: '#0A0A0F',
        scrollbarWidth: 'none',
      }}
    >
      {/* CSS for hidden scrollbar */}
      <style>{`
        .discover-page::-webkit-scrollbar { display: none; }
        @keyframes gradientMove {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.1); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Animated radial gradient */}
      <div
        className="fixed top-0 left-0 w-[800px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsla(172,60%,30%,0.12) 0%, hsla(220,60%,20%,0.06) 50%, transparent 80%)',
          animation: 'gradientMove 12s ease-in-out infinite',
          filter: 'blur(80px)',
        }}
      />

      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 discover-page">
        {/* HERO */}
        <Section delay={0} className="text-center mb-16">
          <h1
            className="text-white font-bold"
            style={{ fontSize: 48, letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            {getGreeting()}, {displayName || 'där'}.
          </h1>
          <p className="mt-4 text-[hsl(172,66%,50%)] text-lg h-7">
            {typedSubtitle}
            <span className="animate-pulse">|</span>
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-8 flex justify-center">
            <div
              className={`relative w-full max-w-[500px] transition-all duration-300 ${
                searchFocused ? 'ring-2 ring-[hsl(172,66%,50%)]/40' : ''
              }`}
              style={{
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                boxShadow: searchFocused
                  ? '0 0 30px hsla(172,66%,50%,0.15)'
                  : '0 2px 12px rgba(0,0,0,0.2)',
              }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                id="discover-search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Sök bland alla bolag..."
                className="w-full bg-transparent text-white placeholder:text-white/30 pl-11 pr-16 py-3.5 text-sm outline-none"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white/30 bg-white/10 rounded px-1.5 py-0.5 border border-white/10">
                ⌘K
              </kbd>
            </div>
          </form>
        </Section>

        {/* HETT JUST NU */}
        <Section delay={0.15} className="mb-14">
          <SectionTitle>Hett just nu</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hotLeads.map((lead, i) => {
              const cfg = getIndustryConfig(lead.industry_label);
              return (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="group relative rounded-2xl overflow-hidden"
                  style={{ height: 380 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} transition-all duration-300`} />
                  {/* Shimmer on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s linear infinite',
                    }}
                  />
                  <div className="relative h-full flex flex-col justify-between p-6">
                    <div>
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-white/60 bg-white/10 rounded-full px-2.5 py-1 mb-3">
                        {lead.industry_label || 'Okänd bransch'}
                      </span>
                      <h3 className="text-2xl font-bold text-white leading-tight">{lead.company_name}</h3>
                      <p className="text-sm text-white/60 mt-1">{lead.city || 'Okänd stad'}</p>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Registrerad</p>
                        <p className="text-sm text-white/80 mt-0.5">
                          {lead.registration_date
                            ? new Date(lead.registration_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '–'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-white">{lead._score}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Score</p>
                      </div>
                    </div>
                    {/* CTA on hover */}
                    <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <Button
                        size="sm"
                        className="w-full bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30 rounded-xl"
                        onClick={e => { e.preventDefault(); navigate(`/leads/${lead.id}`); }}
                      >
                        Visa detaljer <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>

        {/* MATCHAR DINA BEVAKNINGAR */}
        <Section delay={0.3} className="mb-14">
          <SectionTitle>Matchar dina bevakningar</SectionTitle>
          {watchlists.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-white/40 text-sm mb-4">Skapa en bevakning för att se matchande bolag här</p>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white/70 hover:bg-white/10 rounded-xl gap-1.5"
                onClick={() => navigate('/watchlists')}
              >
                <Plus className="w-3.5 h-3.5" /> Skapa bevakning
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {watchlists.slice(0, 5).map(w => {
                const matches = watchlistMatches[w.id] ?? [];
                const filters = w.filters_json as any;
                const filterLabel = filters?.industry_label || filters?.city || filters?.company_form || 'Filter';
                return (
                  <div key={w.id} className="flex-shrink-0 space-y-2">
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-1">{w.name}</p>
                    {matches.length === 0 ? (
                      <div
                        className="w-64 rounded-xl p-4"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <p className="text-xs text-white/30">Inga nya matchningar</p>
                      </div>
                    ) : (
                      matches.map(m => (
                        <Link
                          key={m.id}
                          to={`/leads/${m.id}`}
                          className="block w-64 rounded-xl p-4 transition-all duration-200 hover:translate-y-[-2px]"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <p className="text-sm font-medium text-white truncate">{m.company_name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(172,66%,50%)]/15 text-[hsl(172,66%,50%)] font-medium">
                              {filterLabel}
                            </span>
                            <span className="text-xs text-white/30">{m.city || ''}</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* UTFORSKA EFTER BRANSCH */}
        <Section delay={0.45} className="mb-14">
          <SectionTitle>Utforska efter bransch</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INDUSTRIES.map(ind => {
              const count = industryCounts[ind.label] || 0;
              return (
                <Link
                  key={ind.label}
                  to={`/leads?industry=${encodeURIComponent(ind.label)}`}
                  className={`group relative rounded-xl p-5 bg-gradient-to-br ${ind.gradient} transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30`}
                >
                  <ind.icon className="w-6 h-6 text-white/60 mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-white">{ind.label}</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold text-white bg-white/20 rounded-full px-2 py-0.5">
                    {count} bolag
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>

        {/* FORTSÄTT DÄR DU SLUTADE */}
        <Section delay={0.6} className="mb-14">
          <SectionTitle>Fortsätt där du slutade</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentLeads.slice(0, 4).map(lead => (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className="rounded-xl p-4 transition-all duration-200 hover:translate-y-[-2px]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-sm font-medium text-white truncate">{lead.company_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-medium">
                    {stageLabels[lead.pipeline_stage] || lead.pipeline_stage}
                  </span>
                  <span className="text-xs text-white/30 truncate">{lead.city || ''}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
