import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchWatchlists, fetchWatchlistMatchCounts, type SavedWatchlist } from '@/lib/watchlist-api';
import { Users, TrendingUp, Eye, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface WatchlistWithCounts extends SavedWatchlist {
  d7: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leadsToday, setLeadsToday] = useState(0);
  const [leadsWeek, setLeadsWeek] = useState(0);
  const [latestLeads, setLatestLeads] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<WatchlistWithCounts[]>([]);

  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('full_name').eq('id', user.id).single().then(({ data }) => {
      if (data?.full_name) setFirstName(data.full_name.split(' ')[0]);
    });
  }, [user]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay),
      supabase.from('companies').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('companies').select('id, company_name, industry_label, city, registration_date').order('created_at', { ascending: false }).limit(5),
      fetchWatchlists(user.id),
    ]).then(async ([todayRes, weekRes, latestRes, wls]) => {
      setLeadsToday(todayRes.count ?? 0);
      setLeadsWeek(weekRes.count ?? 0);
      setLatestLeads(latestRes.data ?? []);

      const withCounts = await Promise.all(
        wls.slice(0, 5).map(async (w) => {
          try {
            const counts = await fetchWatchlistMatchCounts(w.filters_json as any);
            return { ...w, d7: counts.d7 };
          } catch {
            return { ...w, d7: 0 };
          }
        })
      );
      setWatchlists(withCounts);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-8 max-w-4xl">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const kpis = [
    { label: 'Nya leads idag', value: leadsToday, icon: Users, borderClass: 'kpi-border-primary', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { label: 'Nya leads denna vecka', value: leadsWeek, icon: TrendingUp, borderClass: 'kpi-border-success', iconBg: 'bg-success/10', iconColor: 'text-success' },
    { label: 'Aktiva bevakningar', value: watchlists.length, icon: Eye, borderClass: 'kpi-border-info', iconBg: 'bg-info/10', iconColor: 'text-info' },
  ];

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {firstName ? `Välkommen tillbaka, ${firstName} 👋` : 'Välkommen tillbaka! 👋'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 capitalize">{dateStr}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {kpis.map(kpi => (
          <Card key={kpi.label} className={kpi.borderClass}>
            <CardContent className="pt-6 pb-6 px-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-4xl font-extrabold mt-2 text-foreground">{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Latest Leads */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Senaste leads</CardTitle>
            <Link to="/leads">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs hover:bg-accent transition-all duration-150">
                Visa alla leads <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {latestLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Inga leads ännu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bolagsnamn</th>
                    <th className="pb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bransch</th>
                    <th className="pb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Stad</th>
                    <th className="pb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Reg.datum</th>
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.map(lead => (
                    <tr key={lead.id} className="border-b last:border-0 hover-row">
                      <td className="py-3.5">
                        <Link to={`/leads/${lead.id}`} className="font-medium hover:text-primary transition-colors duration-150">
                          {lead.company_name}
                        </Link>
                      </td>
                      <td className="py-3.5 text-muted-foreground">{lead.industry_label || '–'}</td>
                      <td className="py-3.5 text-muted-foreground">{lead.city || '–'}</td>
                      <td className="py-3.5 text-muted-foreground text-right">{lead.registration_date || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watchlists */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Dina bevakningar</CardTitle>
            <Link to="/watchlists">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs hover:bg-accent transition-all duration-150">
                Hantera bevakningar <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {watchlists.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Inga bevakningar ännu.</p>
          ) : (
            <div className="space-y-3">
              {watchlists.map(w => (
                <Link
                  key={w.id}
                  to={`/watchlists/${w.id}`}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-primary/20 transition-all duration-150"
                >
                  <span className="font-medium text-sm">{w.name}</span>
                  <span className="text-sm text-muted-foreground">{w.d7} matchningar (7d)</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
