import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchWatchlists, fetchWatchlistMatchCounts, type SavedWatchlist } from '@/lib/watchlist-api';
import { fetchNotesTodayCount, fetchLeadNoteCounts } from '@/lib/lead-notes-api';
import { Users, TrendingUp, Eye, ArrowRight, MessageSquare, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import IndustryBadge from '@/components/IndustryBadge';

interface WatchlistWithCounts extends SavedWatchlist {
  d7: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isNewLead(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leadsToday, setLeadsToday] = useState(0);
  const [leadsWeek, setLeadsWeek] = useState(0);
  const [notesToday, setNotesToday] = useState(0);
  const [latestLeads, setLatestLeads] = useState<any[]>([]);
  const [leadNoteCounts, setLeadNoteCounts] = useState<Record<string, number>>({});
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
      fetchNotesTodayCount(),
    ]).then(async ([todayRes, weekRes, latestRes, wls, notesCount]) => {
      setLeadsToday(todayRes.count ?? 0);
      setLeadsWeek(weekRes.count ?? 0);
      setNotesToday(notesCount);
      const leads = latestRes.data ?? [];
      setLatestLeads(leads);

      // Fetch note counts for latest leads
      const leadIds = leads.map((l: any) => l.id);
      if (leadIds.length > 0) {
        fetchLeadNoteCounts(leadIds).then(setLeadNoteCounts).catch(() => {});
      }

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Nya leads idag',
      value: leadsToday,
      icon: Users,
      borderClass: 'kpi-border-primary',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      trend: `↑ ${leadsWeek} denna vecka`,
    },
    {
      label: 'Nya leads denna vecka',
      value: leadsWeek,
      icon: TrendingUp,
      borderClass: 'kpi-border-success',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      trend: null,
    },
    {
      label: 'Aktiva bevakningar',
      value: watchlists.length,
      icon: Eye,
      borderClass: 'kpi-border-info',
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
      trend: null,
    },
    {
      label: 'Anteckningar idag',
      value: notesToday,
      icon: StickyNote,
      borderClass: 'kpi-border-warning',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      trend: null,
    },
  ];

  return (
    <div className="space-y-10 max-w-4xl animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {firstName ? `Välkommen tillbaka, ${firstName} 👋` : 'Välkommen tillbaka! 👋'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{dateStr}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map(kpi => (
          <Card key={kpi.label} className={kpi.borderClass}>
            <CardContent className="pt-6 pb-5 px-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-3xl font-bold tracking-tight mt-2 text-foreground">{kpi.value}</p>
                  {kpi.trend && (
                    <p className="text-xs text-muted-foreground mt-1.5">{kpi.trend}</p>
                  )}
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Senaste leads</h2>
          <Link to="/leads">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full border-border hover:bg-accent transition-all duration-150">
              Visa alla leads <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {latestLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Inga leads ännu.</p>
            ) : (
              <TooltipProvider>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bolagsnamn</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bransch</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Stad</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Reg.datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestLeads.map(lead => (
                      <tr key={lead.id} className="border-b border-border last:border-0 hover-row">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary transition-colors duration-150">
                              {lead.company_name}
                            </Link>
                            {leadNoteCounts[lead.id] > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <MessageSquare className="w-3 h-3" />
                                    <span className="text-[10px]">{leadNoteCounts[lead.id]}</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">{leadNoteCounts[lead.id]} anteckning{leadNoteCounts[lead.id] > 1 ? 'ar' : ''}</TooltipContent>
                              </Tooltip>
                            )}
                            {isNewLead(lead.registration_date) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Nytt
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <IndustryBadge industry={lead.industry_label} />
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{lead.city || '–'}</td>
                        <td className="px-5 py-4 text-muted-foreground text-right">{formatDate(lead.registration_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Watchlists */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dina bevakningar</h2>
          <Link to="/watchlists">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full border-border hover:bg-accent transition-all duration-150">
              Hantera bevakningar <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {watchlists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Inga bevakningar ännu.</p>
            ) : (
              <div className="divide-y divide-border">
                {watchlists.map(w => (
                  <Link
                    key={w.id}
                    to={`/watchlists/${w.id}`}
                    className="flex items-center justify-between py-3.5 px-5 hover:bg-muted/40 transition-all duration-150"
                  >
                    <span className="font-medium text-sm text-foreground">{w.name}</span>
                    <span className="text-xs text-muted-foreground">{w.d7} matchningar (7d)</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
