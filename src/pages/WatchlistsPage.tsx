import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchWatchlists,
  createWatchlist,
  deleteWatchlist,
  fetchWatchlistMatchCount,
  type SavedWatchlist,
  type WatchlistFilters,
} from '@/lib/watchlist-api';
import {
  fetchDistinctCities,
  fetchDistinctCounties,
  fetchDistinctIndustries,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Plus, Trash2, Bell, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { value: 'company_registered', label: 'Nyregistrerat' },
  { value: 'vat_registered', label: 'Momsregistrerat' },
  { value: 'f_tax_registered', label: 'F-skatt' },
  { value: 'employer_registered', label: 'Arbetsgivare' },
  { value: 'address_changed', label: 'Adressändring' },
  { value: 'industry_changed', label: 'Branschändring' },
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

export default function WatchlistsPage() {
  const { user } = useAuth();
  const [watchlists, setWatchlists] = useState<SavedWatchlist[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [filters, setFilters] = useState<WatchlistFilters>({});

  // Options for dropdowns
  const [cities, setCities] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    load();
    Promise.all([fetchDistinctCities(), fetchDistinctCounties(), fetchDistinctIndustries()])
      .then(([c, co, i]) => { setCities(c); setCounties(co); setIndustries(i); });
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const wl = await fetchWatchlists(user.id);
      setWatchlists(wl);
      // Fetch match counts in parallel
      const counts: Record<string, number> = {};
      await Promise.all(wl.map(async (w) => {
        counts[w.id] = await fetchWatchlistMatchCount(w.filters_json as WatchlistFilters);
      }));
      setMatchCounts(counts);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!user || !name.trim()) return;
    // Remove empty filter values
    const cleanFilters: WatchlistFilters = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) (cleanFilters as any)[k] = v;
    });
    setCreating(true);
    try {
      await createWatchlist(user.id, name, cleanFilters);
      setName('');
      setFilters({});
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bevakningar</h1>
        <p className="text-sm text-muted-foreground mt-1">Skapa bevakningar för att följa nya bolag och händelser</p>
      </div>

      {/* Create watchlist form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Skapa ny bevakning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Namn på bevakning, t.ex. 'Nya restauranger i Stockholm'"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={filters.city || '_none'} onValueChange={v => updateFilter('city', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Stad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Alla städer</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.county || '_none'} onValueChange={v => updateFilter('county', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Län" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Alla län</SelectItem>
                {counties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.industry_label || '_none'} onValueChange={v => updateFilter('industry_label', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Bransch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Alla branscher</SelectItem>
                {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.event_type || '_none'} onValueChange={v => updateFilter('event_type', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Händelsetyp" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Alla händelser</SelectItem>
                {EVENT_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.website_status || '_none'} onValueChange={v => updateFilter('website_status', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Hemsidestatus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Alla</SelectItem>
                {WEBSITE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.phone_status || '_none'} onValueChange={v => updateFilter('phone_status', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Telefonstatus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Alla</SelectItem>
                {PHONE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {activeFilterCount > 0 ? `${activeFilterCount} filter aktiva` : 'Inga filter valda – matchar alla bolag'}
            </span>
            <Button onClick={handleCreate} disabled={!name.trim() || creating} size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {creating ? 'Skapar...' : 'Skapa bevakning'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : watchlists.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Inga bevakningar ännu. Skapa din första ovan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {watchlists.map(wl => {
            const f = wl.filters_json as WatchlistFilters;
            const count = matchCounts[wl.id] ?? 0;
            const filterTags = [
              f.city, f.county, f.industry_label, f.company_form,
              f.website_status && WEBSITE_STATUSES.find(s => s.value === f.website_status)?.label,
              f.phone_status && PHONE_STATUSES.find(s => s.value === f.phone_status)?.label,
              f.event_type && EVENT_TYPES.find(e => e.value === f.event_type)?.label,
            ].filter(Boolean);

            return (
              <Card key={wl.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="text-sm font-semibold truncate">{wl.name}</h3>
                      <Badge variant={count > 0 ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {count} träffar (7d)
                      </Badge>
                    </div>
                    {filterTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {filterTags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/watchlists/${wl.id}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        Visa <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(wl.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
