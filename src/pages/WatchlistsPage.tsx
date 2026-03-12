import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchWatchlists,
  createWatchlist,
  deleteWatchlist,
  fetchWatchlistMatchCounts,
  type SavedWatchlist,
  type WatchlistFilters,
} from '@/lib/watchlist-api';
import {
  fetchDistinctCities,
  fetchDistinctIndustries,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Bell, ArrowRight, ChevronDown, Eye } from 'lucide-react';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { value: 'company_registered', label: 'Nyregistrerat' },
  { value: 'vat_registered', label: 'Momsregistrerat' },
  { value: 'f_tax_registered', label: 'F-skatt' },
  { value: 'employer_registered', label: 'Arbetsgivare' },
  { value: 'address_changed', label: 'Adressändring' },
  { value: 'employee_count_updated', label: 'Antal anställda' },
];

const WEBSITE_STATUSES = [
  { value: 'has_website', label: 'Har hemsida' },
  { value: 'social_only', label: 'Bara sociala' },
  { value: 'no_website_found', label: 'Utan hemsida' },
  { value: 'unknown', label: 'Okänd' },
];

const PHONE_STATUSES = [
  { value: 'has_phone', label: 'Har telefon' },
  { value: 'missing', label: 'Saknas' },
  { value: 'unknown', label: 'Okänd' },
];

const BOOL_OPTIONS = [
  { value: 'true', label: 'Ja' },
  { value: 'false', label: 'Nej' },
];

export default function WatchlistsPage() {
  const { user } = useAuth();
  const [watchlists, setWatchlists] = useState<SavedWatchlist[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, { d1: number; d7: number; d30: number }>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [name, setName] = useState('');
  const [filters, setFilters] = useState<WatchlistFilters>({});

  const [cities, setCities] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    load();
    Promise.all([fetchDistinctCities(), fetchDistinctIndustries()])
      .then(([c, i]) => { setCities(c); setIndustries(i); });
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const wl = await fetchWatchlists(user.id);
      setWatchlists(wl);
      const counts: Record<string, { d1: number; d7: number; d30: number }> = {};
      await Promise.all(wl.map(async (w) => {
        counts[w.id] = await fetchWatchlistMatchCounts(w.filters_json as WatchlistFilters);
      }));
      setMatchCounts(counts);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!user || !name.trim()) return;
    const cleanFilters: WatchlistFilters = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) (cleanFilters as any)[k] = v;
    });
    setCreating(true);
    try {
      await createWatchlist(user.id, name, cleanFilters);
      setName('');
      setFilters({});
      setAdvancedOpen(false);
      toast.success('Bevakning skapad');
      await load();
    } catch {
      toast.error('Kunde inte skapa bevakning');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWatchlist(id);
      toast.success('Bevakning borttagen');
      await load();
    } catch {
      toast.error('Kunde inte ta bort bevakning');
    }
  }

  const updateFilter = (key: keyof WatchlistFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === '_none' ? undefined : value }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function summarizeFilters(f: WatchlistFilters): string {
    const parts: string[] = [];
    if (f.city) parts.push(f.city);
    if (f.county) parts.push(f.county);
    if (f.industry_label) parts.push(f.industry_label);
    if (f.company_form) parts.push(f.company_form);
    if (f.website_status) parts.push(WEBSITE_STATUSES.find(s => s.value === f.website_status)?.label ?? f.website_status);
    if (f.phone_status) parts.push(PHONE_STATUSES.find(s => s.value === f.phone_status)?.label ?? f.phone_status);
    if (f.event_type) parts.push(EVENT_TYPES.find(e => e.value === f.event_type)?.label ?? f.event_type);
    return parts.length > 0 ? parts.join(' · ') : 'Alla bolag';
  }

  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Bevakningar</h1>
        <p className="text-muted-foreground mt-1">
          Få automatiska notiser när nya bolag matchar dina kriterier
        </p>
      </div>

      {/* Create watchlist */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Namn på bevakning</label>
            <Input
              placeholder="T.ex. 'Nya restauranger i Stockholm'"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Bransch</label>
              <Select value={filters.industry_label || '_none'} onValueChange={v => updateFilter('industry_label', v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Alla branscher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Alla branscher</SelectItem>
                  {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Stad</label>
              <Select value={filters.city || '_none'} onValueChange={v => updateFilter('city', v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Alla städer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Alla städer</SelectItem>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced filters */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                Avancerade filter
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Bolagsform</label>
                  <Select value={filters.company_form || '_none'} onValueChange={v => updateFilter('company_form', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Alla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla bolagsformer</SelectItem>
                      {['AB', 'HB', 'EF', 'KB', 'Stiftelse'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">F-skatt</label>
                  <Select value={filters.f_tax_registered || '_none'} onValueChange={v => updateFilter('f_tax_registered', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Alla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla</SelectItem>
                      {BOOL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Momsregistrerad</label>
                  <Select value={filters.vat_registered || '_none'} onValueChange={v => updateFilter('vat_registered', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Alla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla</SelectItem>
                      {BOOL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Arbetsgivare</label>
                  <Select value={filters.employer_registered || '_none'} onValueChange={v => updateFilter('employer_registered', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Alla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla</SelectItem>
                      {BOOL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Hemsidestatus</label>
                  <Select value={filters.website_status || '_none'} onValueChange={v => updateFilter('website_status', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Alla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla</SelectItem>
                      {WEBSITE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Telefonstatus</label>
                  <Select value={filters.phone_status || '_none'} onValueChange={v => updateFilter('phone_status', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Alla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla</SelectItem>
                      {PHONE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Händelsetyp</label>
                  <Select value={filters.event_type || '_none'} onValueChange={v => updateFilter('event_type', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Alla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla händelser</SelectItem>
                      {EVENT_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Registrerad efter</label>
                  <Input
                    type="date"
                    value={filters.registeredAfter || ''}
                    onChange={e => updateFilter('registeredAfter', e.target.value || '_none')}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Registrerad före</label>
                  <Input
                    type="date"
                    value={filters.registeredBefore || ''}
                    onChange={e => updateFilter('registeredBefore', e.target.value || '_none')}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Create button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              {activeFilterCount > 0 ? `${activeFilterCount} filter aktiva` : 'Inga filter — matchar alla bolag'}
            </span>
            <Button onClick={handleCreate} disabled={!name.trim() || creating} className="gap-1.5">
              <Plus className="w-4 h-4" />
              {creating ? 'Skapar...' : 'Skapa bevakning'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Dina bevakningar
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : watchlists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Inga bevakningar ännu. Skapa din första ovan.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {watchlists.map(wl => {
              const f = wl.filters_json as WatchlistFilters;
              const counts = matchCounts[wl.id] ?? { d1: 0, d7: 0, d30: 0 };

              return (
                <Card key={wl.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-5 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <Eye className="w-4 h-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">{wl.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 ml-6">
                          {summarizeFilters(f)}
                        </p>
                        <div className="flex items-center gap-2 mt-3 ml-6">
                          <Badge variant={counts.d1 > 0 ? 'default' : 'secondary'} className="text-xs">
                            {counts.d1} nya (24h)
                          </Badge>
                          <Badge variant={counts.d7 > 0 ? 'default' : 'secondary'} className="text-xs">
                            {counts.d7} nya (7d)
                          </Badge>
                          <Badge variant={counts.d30 > 0 ? 'default' : 'secondary'} className="text-xs">
                            {counts.d30} nya (30d)
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        <Link to={`/watchlists/${wl.id}`}>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            Visa <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(wl.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
