import { useEffect, useState, useMemo, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Bell, ArrowRight, ChevronDown, Eye, Star, ArrowUpRight, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const formRef = useRef<HTMLDivElement>(null);
  const [watchlists, setWatchlists] = useState<SavedWatchlist[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, { d1: number; d7: number; d30: number }>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [name, setName] = useState('');
  const [filters, setFilters] = useState<WatchlistFilters>({});
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyFrequency, setNotifyFrequency] = useState('instant');

  const [cities, setCities] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    load();
    setNotifyEmail(user.email || '');
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
      await createWatchlist(user.id, name, cleanFilters, {
        notification_email: notifyEmail || undefined,
        notify_enabled: notifyEnabled,
        notify_frequency: notifyFrequency,
      });
      setName('');
      setFilters({});
      setAdvancedOpen(false);
      setNotifyEnabled(true);
      setNotifyFrequency('instant');
      setNotifyEmail(user.email || '');
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

  const placeholderName = useMemo(() => {
    const parts: string[] = [];
    if (filters.industry_label) parts.push(filters.industry_label.length > 20 ? filters.industry_label.slice(0, 18) + '…' : filters.industry_label);
    if (filters.city) parts.push(`i ${filters.city}`);
    if (parts.length > 0) return parts.join(' ');
    return "T.ex. 'Nya IT-bolag i Stockholm'";
  }, [filters.industry_label, filters.city]);

  function summarizeFilters(f: WatchlistFilters): string {
    const parts: string[] = [];
    if (f.city) parts.push(f.city);
    if (f.county) parts.push(f.county);
    if (f.industry_label) parts.push(f.industry_label.length > 30 ? f.industry_label.slice(0, 28) + '…' : f.industry_label);
    if (f.company_form) parts.push(f.company_form);
    if (f.website_status) parts.push(WEBSITE_STATUSES.find(s => s.value === f.website_status)?.label ?? f.website_status);
    if (f.phone_status) parts.push(PHONE_STATUSES.find(s => s.value === f.phone_status)?.label ?? f.phone_status);
    if (f.event_type) parts.push(EVENT_TYPES.find(e => e.value === f.event_type)?.label ?? f.event_type);
    return parts.length > 0 ? parts.join(' · ') : 'Alla bolag';
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bevakningar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Få automatiska notiser när nya bolag matchar dina kriterier
        </p>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left: Create form (3/5 = 60%) */}
        <div className="lg:col-span-3" ref={formRef}>
          <Card className="overflow-hidden">
            <div
              className="px-6 py-5 border-b border-border"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.3) 100%)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Ny bevakning</h2>
                  <p className="text-xs text-muted-foreground">Välj kriterier och ge din bevakning ett namn</p>
                </div>
              </div>
            </div>

            <CardContent className="pt-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Namn på bevakning</label>
                <Input
                  placeholder={placeholderName}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-10 border-border focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Bransch</label>
                  <Select value={filters.industry_label || '_none'} onValueChange={v => updateFilter('industry_label', v)}>
                    <SelectTrigger className="h-10 border-border focus:ring-primary"><SelectValue placeholder="Alla branscher" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Alla branscher</SelectItem>
                      {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Stad</label>
                  <Select value={filters.city || '_none'} onValueChange={v => updateFilter('city', v)}>
                    <SelectTrigger className="h-10 border-border focus:ring-primary"><SelectValue placeholder="Alla städer" /></SelectTrigger>
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
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
                    Avancerade filter
                    {activeFilterCount > 2 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full ml-1">
                        {activeFilterCount - (filters.industry_label ? 1 : 0) - (filters.city ? 1 : 0)}
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 duration-200">
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

              {/* Notification settings */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="notify-toggle" className="text-sm font-medium">Aktivera e-postnotifikationer</Label>
                  </div>
                  <Switch id="notify-toggle" checked={notifyEnabled} onCheckedChange={setNotifyEnabled} />
                </div>

                {notifyEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Notifikations-e-post</label>
                      <Input
                        type="email"
                        placeholder={user?.email || 'din@email.se'}
                        value={notifyEmail}
                        onChange={e => setNotifyEmail(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Frekvens</label>
                      <Select value={notifyFrequency} onValueChange={setNotifyFrequency}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Direkt</SelectItem>
                          <SelectItem value="daily">Daglig sammanfattning</SelectItem>
                          <SelectItem value="weekly">Veckovis sammanfattning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Create button */}
              <div className="pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || creating}
                  className="w-full gap-2 h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {creating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Skapar bevakning…</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Skapa bevakning</>
                  )}
                </Button>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {activeFilterCount} filter aktiva
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Watchlist list (2/5 = 40%) */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Aktiva bevakningar
            {!loading && watchlists.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] rounded-full px-2 py-0">
                {watchlists.length}
              </Badge>
            )}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : watchlists.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-info" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground">Inga bevakningar ännu</h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px] mx-auto">
                  Skapa din första bevakning för att få notiser om nya bolag
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full gap-1.5"
                  onClick={scrollToForm}
                >
                  Kom igång <ArrowRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {watchlists.map(wl => {
                const f = wl.filters_json as WatchlistFilters;
                const counts = matchCounts[wl.id] ?? { d1: 0, d7: 0, d30: 0 };

                return (
                  <Card key={wl.id} className="hover:border-primary/30 transition-all duration-150">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                            <h3 className="text-sm font-semibold text-foreground truncate">{wl.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-5.5 truncate">
                            {summarizeFilters(f)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2.5 ml-5.5">
                            <Badge variant={counts.d1 > 0 ? 'default' : 'secondary'} className="text-[10px] px-2 py-0 rounded-full">
                              {counts.d1} (24h)
                            </Badge>
                            <Badge variant={counts.d7 > 0 ? 'default' : 'secondary'} className="text-[10px] px-2 py-0 rounded-full">
                              {counts.d7} (7d)
                            </Badge>
                            <Badge variant={counts.d30 > 0 ? 'default' : 'secondary'} className="text-[10px] px-2 py-0 rounded-full">
                              {counts.d30} (30d)
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Link to={`/watchlists/${wl.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <ArrowRight className="w-4 h-4" />
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
    </div>
  );
}
