import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchWatchlistById,
  fetchWatchlistMatches,
  fetchWatchlistEvents,
  type WatchlistFilters,
} from '@/lib/watchlist-api';
import { calculateLeadScore, type Company } from '@/lib/api';
import type { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';
import { ArrowLeft, Building2, Activity, ExternalLink, Zap, MapPin, BarChart3, FileCheck, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EVENT_TYPE_META: Record<string, { label: string; icon: typeof Zap; className: string }> = {
  company_registered: { label: 'Nyregistrerat', icon: Building2, className: 'bg-primary/10 text-primary' },
  vat_registered: { label: 'Momsregistrerat', icon: FileCheck, className: 'bg-success/10 text-success' },
  f_tax_registered: { label: 'F-skatt', icon: FileCheck, className: 'bg-warning/10 text-warning' },
  employer_registered: { label: 'Arbetsgivare', icon: Briefcase, className: 'bg-accent/20 text-accent-foreground' },
  address_changed: { label: 'Adressändring', icon: MapPin, className: 'bg-secondary text-secondary-foreground' },
  industry_changed: { label: 'Branschändring', icon: BarChart3, className: 'bg-secondary text-secondary-foreground' },
};

export default function WatchlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [watchlist, setWatchlist] = useState<Tables<'saved_watchlists'> | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchWatchlistById(id).then(async wl => {
      setWatchlist(wl);
      const f = wl.filters_json as WatchlistFilters;
      const [c, e] = await Promise.all([
        fetchWatchlistMatches(f),
        fetchWatchlistEvents(f),
      ]);
      setCompanies(c);
      setEvents(e);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!watchlist) {
    return <p className="text-muted-foreground">Bevakning hittades inte.</p>;
  }

  const f = watchlist.filters_json as WatchlistFilters;
  const filterTags = [
    f.city, f.county, f.industry_label, f.company_form,
    f.website_status, f.phone_status, f.event_type,
  ].filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/watchlists">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{watchlist.name}</h1>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {filterTags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
            {filterTags.length === 0 && (
              <span className="text-xs text-muted-foreground">Alla bolag (inga filter)</span>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Bolag ({companies.length})
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Händelser ({events.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bolag</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Stad</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Bransch</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hemsida</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Telefon</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Inga matchande bolag senaste 7 dagarna.</td></tr>
                  ) : companies.map(c => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.company_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.city}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.industry_label}</td>
                      <td className="px-4 py-3"><WebsiteStatusBadge status={c.website_status} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><PhoneStatusBadge status={c.phone_status} /></td>
                      <td className="px-4 py-3 text-center"><ScoreBadge score={calculateLeadScore(c)} /></td>
                      <td className="px-4 py-3">
                        <Link to={`/leads/${c.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                          Visa <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Inga matchande händelser senaste 7 dagarna.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev: any) => {
                    const meta = EVENT_TYPE_META[ev.event_type] || { label: ev.event_type, icon: Zap, className: 'bg-secondary text-secondary-foreground' };
                    const Icon = meta.icon;
                    const companyName = ev.companies?.company_name || 'Okänt bolag';
                    const companyId = ev.companies?.id;
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
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.event_label || meta.label}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{ev.event_date}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
