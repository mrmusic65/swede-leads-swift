import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, fetchLatestEvents, fetchTodayEventCounts, type CompanyEvent } from '@/lib/api';
import { fetchRecentAlertRuns, fetchTodayAlertSummary, triggerAlertRun, type AlertRunWithWatchlist } from '@/lib/watchlist-api';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Globe, Share2, Phone, BarChart3, MapPin, Trophy, CalendarPlus, Clock, Star, ArrowRight, Zap, Activity, FileCheck, Briefcase, Bell, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';
import { toast } from 'sonner';

const EVENT_TYPE_META: Record<string, { label: string; icon: typeof Zap; className: string }> = {
  company_registered: { label: 'Nyregistrerat', icon: Building2, className: 'bg-primary/10 text-primary' },
  vat_registered: { label: 'Momsregistrerat', icon: FileCheck, className: 'bg-success/10 text-success' },
  f_tax_registered: { label: 'F-skatt', icon: FileCheck, className: 'bg-warning/10 text-warning' },
  employer_registered: { label: 'Arbetsgivare', icon: Briefcase, className: 'bg-accent/20 text-accent-foreground' },
  address_changed: { label: 'Adressändring', icon: MapPin, className: 'bg-secondary text-secondary-foreground' },
  industry_changed: { label: 'Branschändring', icon: BarChart3, className: 'bg-secondary text-secondary-foreground' },
  employee_count_updated: { label: 'Antal anställda', icon: BarChart3, className: 'bg-primary/10 text-primary' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(null);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [alertRuns, setAlertRuns] = useState<AlertRunWithWatchlist[]>([]);
  const [alertSummary, setAlertSummary] = useState<{ totalMatches: number; watchlistsWithMatches: number }>({ totalMatches: 0, watchlistsWithMatches: 0 });
  const [runningAlerts, setRunningAlerts] = useState(false);

  useEffect(() => {
    const promises: Promise<any>[] = [
      fetchDashboardStats(),
      fetchLatestEvents({ limit: 20 }),
      fetchTodayEventCounts(),
    ];
    if (user) {
      promises.push(fetchRecentAlertRuns(user.id, 10));
      promises.push(fetchTodayAlertSummary(user.id));
    }
    Promise.all(promises).then(([s, e, c, ar, as_]) => {
      setStats(s);
      setEvents(e);
      setEventCounts(c);
      if (ar) setAlertRuns(ar);
      if (as_) setAlertSummary(as_);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!loading) {
      fetchLatestEvents({ limit: 20, event_type: eventFilter === 'all' ? undefined : eventFilter })
        .then(setEvents)
        .catch(console.error);
    }
  }, [eventFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpiCards = [
    { label: 'Nya bolag (30 dagar)', value: stats.newLast30, icon: Building2, color: 'text-primary' },
    { label: 'Nya bolag idag', value: stats.newToday, icon: CalendarPlus, color: 'text-success' },
    { label: 'Utan hemsida', value: stats.noWebsite, icon: Globe, color: 'text-destructive' },
    { label: 'Bara sociala medier', value: stats.socialOnly, icon: Share2, color: 'text-warning' },
    { label: 'Har telefonnummer', value: stats.hasPhone, icon: Phone, color: 'text-success' },
  ];

  const totalEventsToday = Object.values(eventCounts).reduce((a, b) => a + b, 0);

  const filteredEvents = events;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Trigger intelligence för svenska bolag</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Business opportunities today */}
      <Card className="border-warning/30 bg-warning/[0.03]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              Affärsmöjligheter idag
            </CardTitle>
            <span className="text-xs text-muted-foreground">{totalEventsToday} händelser idag</span>
          </div>
          <p className="text-xs text-muted-foreground">Nyregistreringar och statusändringar från svenska datakällor</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(EVENT_TYPE_META).map(([type, meta]) => {
              const count = eventCounts[type] || 0;
              const Icon = meta.icon;
              return (
                <div key={type} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.className}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-lg font-bold">{count}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent alerts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-warning" />
              Senaste bevakningsalerts
              {alertSummary.totalMatches > 0 && (
                <Badge variant="default" className="text-[10px] ml-1">{alertSummary.totalMatches} träffar idag</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={runningAlerts}
                onClick={async () => {
                  setRunningAlerts(true);
                  try {
                    const result = await triggerAlertRun();
                    toast.success(`Alert-körning klar: ${result.runs} bevakningar processade`);
                    if (user) {
                      const [ar, as_] = await Promise.all([
                        fetchRecentAlertRuns(user.id, 10),
                        fetchTodayAlertSummary(user.id),
                      ]);
                      setAlertRuns(ar);
                      setAlertSummary(as_);
                    }
                  } catch {
                    toast.error('Kunde inte köra alerts');
                  } finally {
                    setRunningAlerts(false);
                  }
                }}
              >
                <RefreshCw className={`w-3 h-3 ${runningAlerts ? 'animate-spin' : ''}`} />
                {runningAlerts ? 'Kör...' : 'Kör alerts nu'}
              </Button>
              <Link to="/watchlists">
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  Bevakningar <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alertRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Inga alerts ännu. Skapa en bevakning och kör alerts.</p>
          ) : (
            <div className="space-y-2">
              {alertRuns.map(run => {
                const wlName = (run.saved_watchlists as any)?.name || 'Okänd bevakning';
                const date = new Date(run.run_timestamp);
                const timeStr = date.toLocaleDateString('sv-SE') + ' ' + date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={run.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${run.matched_count > 0 ? 'bg-warning/10 text-warning' : 'bg-secondary text-muted-foreground'}`}>
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{wlName}</span>
                        <Badge variant={run.matched_count > 0 ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 shrink-0">
                          {run.matched_count} {run.matched_count === 1 ? 'träff' : 'träffar'}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured: Best website prospects */}
      {stats.bestWebsiteProspects.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-warning" />
                Bästa hemsideprospekten idag
              </CardTitle>
              <Link to="/leads" onClick={() => sessionStorage.setItem('activate_high_priority_view', '1')}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  Visa alla high priority <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">Bolag utan hemsida, med telefon, registrerade senaste 30 dagarna</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.bestWebsiteProspects.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <Link to={`/leads/${p.id}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.city}{p.industry_label ? ` · ${p.industry_label}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <WebsiteStatusBadge status={p.website_status} />
                    <PhoneStatusBadge status={p.phone_status} />
                    <ScoreBadge score={p.score} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest company events */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Senaste bolagshändelser
            </CardTitle>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Alla händelser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla händelser</SelectItem>
                {Object.entries(EVENT_TYPE_META).map(([type, meta]) => (
                  <SelectItem key={type} value={type}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Inga händelser ännu. Kör en import för att generera händelser.</p>
          )}
          <div className="space-y-2">
            {filteredEvents.map(ev => {
              const meta = EVENT_TYPE_META[ev.event_type] || { label: ev.event_type, icon: Zap, className: 'bg-secondary text-secondary-foreground' };
              const Icon = meta.icon;
              const companyName = (ev.companies as any)?.company_name || 'Okänt bolag';
              const companyId = (ev.companies as any)?.id;
              return (
                <div key={ev.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.className}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {companyId ? (
                        <Link to={`/leads/${companyId}`} className="text-sm font-medium hover:text-primary transition-colors truncate">
                          {companyName}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium truncate">{companyName}</span>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {ev.event_label || meta.label}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{ev.event_date}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Topp branscher
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topIndustries.length === 0 && <p className="text-sm text-muted-foreground">Ingen data ännu.</p>}
            {stats.topIndustries.map(ind => (
              <div key={ind.name} className="flex items-center justify-between">
                <span className="text-sm truncate mr-2">{ind.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(ind.count / stats.topIndustries[0].count) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-6 text-right">{ind.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Topp städer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topCities.length === 0 && <p className="text-sm text-muted-foreground">Ingen data ännu.</p>}
            {stats.topCities.map(city => (
              <div key={city.name} className="flex items-center justify-between">
                <span className="text-sm truncate mr-2">{city.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(city.count / stats.topCities[0].count) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-6 text-right">{city.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              Högsta lead score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topLeads.length === 0 && <p className="text-sm text-muted-foreground">Ingen data ännu.</p>}
            {stats.topLeads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between">
                <Link to={`/leads/${lead.id}`} className="text-sm truncate mr-2 hover:text-primary transition-colors">
                  {lead.name}
                </Link>
                <ScoreBadge score={lead.score} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Senast tillagda bolag
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.latestCompanies.length === 0 && <p className="text-sm text-muted-foreground">Ingen data ännu.</p>}
            {stats.latestCompanies.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <Link to={`/leads/${c.id}`} className="text-sm truncate mr-2 hover:text-primary transition-colors">
                  {c.name}
                </Link>
                <span className="text-xs text-muted-foreground shrink-0">
                  {c.registration_date || '–'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
