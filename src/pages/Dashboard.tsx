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

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'där';

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

      // Fetch match counts for each watchlist
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
    { label: 'Nya leads idag', value: leadsToday, icon: Users, color: 'text-primary' },
    { label: 'Nya leads denna vecka', value: leadsWeek, icon: TrendingUp, color: 'text-primary' },
    { label: 'Aktiva bevakningar', value: watchlists.length, icon: Eye, color: 'text-primary' },
  ];

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Välkommen tillbaka, {userName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{dateStr}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border">
            <CardContent className="pt-6 pb-6 px-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-4xl font-bold mt-2">{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${kpi.color}`}>
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
            <CardTitle className="text-base font-semibold">Senaste leads</CardTitle>
            <Link to="/leads">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
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
                    <th className="pb-3 font-medium text-muted-foreground">Bolagsnamn</th>
                    <th className="pb-3 font-medium text-muted-foreground">Bransch</th>
                    <th className="pb-3 font-medium text-muted-foreground">Stad</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Reg.datum</th>
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.map(lead => (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="py-3">
                        <Link to={`/leads/${lead.id}`} className="font-medium hover:text-primary transition-colors">
                          {lead.company_name}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">{lead.industry_label || '–'}</td>
                      <td className="py-3 text-muted-foreground">{lead.city || '–'}</td>
                      <td className="py-3 text-muted-foreground text-right">{lead.registration_date || '–'}</td>
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
            <CardTitle className="text-base font-semibold">Dina bevakningar</CardTitle>
            <Link to="/watchlists">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
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
                  className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-secondary/50 transition-colors"
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
