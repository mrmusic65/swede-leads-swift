import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats } from '@/lib/api';
import { Building2, Globe, Share2, Phone, BarChart3, MapPin, Trophy, CalendarPlus, Clock, Star, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';

export default function Dashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats().then(setStats).finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Översikt över svenska leads</p>
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
