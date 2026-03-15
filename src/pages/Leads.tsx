import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCompanies, fetchDistinctCities, fetchDistinctIndustries, calculateLeadScore, exportCompaniesCSV, type LeadFilters, type Company } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ScoreBadge from '@/components/ScoreBadge';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import IndustryBadge from '@/components/IndustryBadge';
import LeadSlideOver from '@/components/LeadSlideOver';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, Download, ChevronLeft, ChevronRight, ExternalLink, X, MapPin, Bookmark, BookmarkCheck, Star, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isNewLead(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 7 * 86400000;
}

const PAGE_SIZE = 30;
const COMPANY_FORMS = ['Aktiebolag', 'Enskild firma', 'Handelsbolag', 'Kommanditbolag', 'Ekonomisk förening'];

interface SavedFilter {
  id: string;
  name: string;
  filter_json: any;
  is_default: boolean;
  created_at: string;
}

// Quick filter presets
const QUICK_FILTERS: { label: string; getFilters: () => Partial<LeadFilters> }[] = [
  { label: 'Alla', getFilters: () => ({}) },
  { label: 'Nya idag', getFilters: () => ({ registeredAfter: new Date().toISOString().slice(0, 10) }) },
  { label: 'Hög score (80+)', getFilters: () => ({ minScore: 80 }) },
  { label: 'IT & Tech', getFilters: () => ({ industry_label: 'Informations- och kommunikationsverksamhet' }) },
  { label: 'Stockholm', getFilters: () => ({ city: 'Stockholm' }) },
  { label: 'Göteborg', getFilters: () => ({ city: 'Göteborg' }) },
  { label: 'Malmö', getFilters: () => ({ city: 'Malmö' }) },
];

function filtersToParams(f: LeadFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.search) p.sok = f.search;
  if (f.industry_label) p.bransch = f.industry_label;
  if (f.city) p.stad = f.city;
  if ((f as any).company_form) p.bolagsform = (f as any).company_form;
  if (f.minScore) p.minScore = String(f.minScore);
  if (f.registeredAfter) p.regEfter = f.registeredAfter;
  return p;
}

function paramsToFilters(params: URLSearchParams): Partial<LeadFilters> {
  const f: any = {};
  if (params.get('sok')) f.search = params.get('sok');
  if (params.get('bransch')) f.industry_label = params.get('bransch');
  if (params.get('stad')) f.city = params.get('stad');
  if (params.get('bolagsform')) f.company_form = params.get('bolagsform');
  if (params.get('minScore')) f.minScore = Number(params.get('minScore'));
  if (params.get('regEfter')) f.registeredAfter = params.get('regEfter');
  return f;
}

function summarizeFilter(fj: any): string {
  const parts: string[] = [];
  if (fj.industry_label) parts.push(fj.industry_label.length > 15 ? fj.industry_label.slice(0, 13) + '…' : fj.industry_label);
  if (fj.city) parts.push(fj.city);
  if (fj.minScore) parts.push(`Score ${fj.minScore}+`);
  if (fj.registeredAfter) parts.push(`Från ${fj.registeredAfter}`);
  if (fj.search) parts.push(`"${fj.search}"`);
  return parts.join(' · ') || 'Alla leads';
}

export default function Leads() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Company | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<LeadFilters>(() => ({
    sortBy: 'created_at',
    sortDir: 'desc',
    page: 1,
    pageSize: PAGE_SIZE,
    ...paramsToFilters(searchParams),
  }));

  // Sync filters → URL
  useEffect(() => {
    const p = filtersToParams(filters);
    setSearchParams(p, { replace: true });
  }, [filters, setSearchParams]);

  // Load saved filters
  const loadSavedFilters = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('saved_filters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setSavedFilters(data);
  }, [user]);

  useEffect(() => { loadSavedFilters(); }, [loadSavedFilters]);

  // Apply default filter on first load
  useEffect(() => {
    if (defaultApplied || savedFilters.length === 0) return;
    // Only apply if no URL params
    if (Array.from(searchParams.keys()).length > 0) { setDefaultApplied(true); return; }
    const def = savedFilters.find(f => f.is_default);
    if (def) {
      setFilters(prev => ({ ...prev, ...def.filter_json, page: 1 }));
    }
    setDefaultApplied(true);
  }, [savedFilters, defaultApplied, searchParams]);

  useEffect(() => {
    Promise.all([fetchDistinctCities(), fetchDistinctIndustries()]).then(([c, i]) => { setCities(c); setIndustries(i); });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchCompanies(filters);
      setCompanies(data);
      setTotalCount(count);
    } finally { setLoading(false); }
  }, [JSON.stringify(filters)]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateFilters = (partial: Partial<LeadFilters>) => {
    setActiveQuickFilter(null);
    setFilters(prev => ({ ...prev, ...partial, page: partial.page ?? 1 }));
  };

  const applyQuickFilter = (label: string, preset: Partial<LeadFilters>) => {
    setActiveQuickFilter(label);
    setFilters({
      sortBy: 'created_at', sortDir: 'desc', page: 1, pageSize: PAGE_SIZE,
      ...preset,
    });
  };

  const applySavedFilter = (sf: SavedFilter) => {
    setActiveQuickFilter(`saved:${sf.id}`);
    setFilters({ sortBy: 'created_at', sortDir: 'desc', page: 1, pageSize: PAGE_SIZE, ...sf.filter_json });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.industry_label) count++;
    if (filters.city) count++;
    if ((filters as any).company_form) count++;
    if (filters.minScore) count++;
    if (filters.registeredAfter) count++;
    return count;
  }, [filters]);

  const clearAllFilters = () => {
    setActiveQuickFilter('Alla');
    setFilters({ sortBy: 'created_at', sortDir: 'desc', page: 1, pageSize: PAGE_SIZE });
  };

  // Save filter
  const handleSaveFilter = async () => {
    if (!user || !saveName.trim()) return;
    setSaving(true);
    const { search, industry_label, city, minScore, registeredAfter, ...rest } = filters;
    const filterJson: any = {};
    if (search) filterJson.search = search;
    if (industry_label) filterJson.industry_label = industry_label;
    if (city) filterJson.city = city;
    if ((filters as any).company_form) filterJson.company_form = (filters as any).company_form;
    if (minScore) filterJson.minScore = minScore;
    if (registeredAfter) filterJson.registeredAfter = registeredAfter;

    const { error } = await (supabase as any).from('saved_filters').insert({
      user_id: user.id,
      name: saveName.trim(),
      filter_json: filterJson,
      is_default: false,
    });
    setSaving(false);
    if (error) { toast.error('Kunde inte spara filter'); return; }
    toast.success('Filter sparat');
    setSaveName('');
    setSavePopoverOpen(false);
    loadSavedFilters();
  };

  const handleDeleteFilter = async (id: string) => {
    await (supabase as any).from('saved_filters').delete().eq('id', id);
    toast.success('Filter borttaget');
    loadSavedFilters();
  };

  const handleToggleDefault = async (sf: SavedFilter) => {
    // Unset all defaults first
    if (!sf.is_default) {
      for (const f of savedFilters) {
        if (f.is_default) {
          await (supabase as any).from('saved_filters').update({ is_default: false }).eq('id', f.id);
        }
      }
    }
    await (supabase as any).from('saved_filters').update({ is_default: !sf.is_default }).eq('id', sf.id);
    toast.success(sf.is_default ? 'Standardfilter borttaget' : 'Satt som standardfilter');
    loadSavedFilters();
  };

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
            {!loading && (
              <Badge variant="secondary" className="text-xs font-medium rounded-full px-2.5 py-0.5">{totalCount}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Nyregistrerade svenska bolag — uppdateras dagligen</p>
        </div>
      </div>

      {/* Quick filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_FILTERS.map(qf => {
          const isActive = activeQuickFilter === qf.label || (qf.label === 'Alla' && !activeQuickFilter && activeFilterCount === 0);
          return (
            <button
              key={qf.label}
              onClick={() => applyQuickFilter(qf.label, qf.getFilters())}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {qf.label}
            </button>
          );
        })}
        {/* Saved filter pills */}
        {savedFilters.map(sf => {
          const isActive = activeQuickFilter === `saved:${sf.id}`;
          return (
            <button
              key={sf.id}
              onClick={() => applySavedFilter(sf)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              {sf.name}
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteFilter(sf.id); }}
                className="hover:text-destructive ml-0.5"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 p-4 rounded-xl glass-card">
        <div className="relative flex-1 min-w-0 w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sök bolag, stad, bransch..."
            value={filters.search ?? ''}
            onChange={e => updateFilters({ search: e.target.value || undefined })}
            className="pl-9 h-10 rounded-full border-border/60 bg-background"
          />
        </div>

        <Select value={filters.industry_label ?? '__all__'} onValueChange={v => updateFilters({ industry_label: v === '__all__' ? undefined : v })}>
          <SelectTrigger className="w-full lg:w-44 h-10 rounded-full border-border/60 bg-background">
            <SelectValue placeholder="Bransch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alla branscher</SelectItem>
            {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.city ?? '__all__'} onValueChange={v => updateFilters({ city: v === '__all__' ? undefined : v })}>
          <SelectTrigger className="w-full lg:w-40 h-10 rounded-full border-border/60 bg-background">
            <SelectValue placeholder="Stad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alla städer</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={(filters as any).company_form ?? '__all__'}
          onValueChange={v => updateFilters({ ...(v === '__all__' ? { company_form: undefined } : { company_form: v }) } as any)}
        >
          <SelectTrigger className="w-full lg:w-44 h-10 rounded-full border-border/60 bg-background">
            <SelectValue placeholder="Bolagsform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alla bolagsformer</SelectItem>
            {COMPANY_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            <X className="w-3.5 h-3.5" /> Rensa filter ({activeFilterCount})
          </button>
        )}

        {/* Saved filters dropdown */}
        {savedFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 rounded-full gap-1.5 text-xs border-border/60">
                <BookmarkCheck className="w-3.5 h-3.5" /> Mina filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {savedFilters.map(sf => (
                <DropdownMenuItem key={sf.id} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={() => applySavedFilter(sf)}>
                  <Bookmark className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sf.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{summarizeFilter(sf.filter_json)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleDefault(sf); }}
                    className="shrink-0 p-1 hover:text-amber-500 transition-colors"
                    title={sf.is_default ? 'Ta bort som standard' : 'Sätt som standard'}
                  >
                    <Star className={`w-3.5 h-3.5 ${sf.is_default ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFilter(sf.id); }}
                    className="shrink-0 p-1 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Save filter button */}
        <Popover open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 rounded-full gap-1.5 text-xs border-border/60">
              <Bookmark className="w-3.5 h-3.5" /> Spara filter
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3 space-y-3">
            <p className="text-sm font-medium">Spara aktuellt filter</p>
            <Input
              placeholder="Filternamn..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              className="h-9"
              onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
            />
            <p className="text-[11px] text-muted-foreground">{summarizeFilter(filters)}</p>
            <Button size="sm" className="w-full" disabled={!saveName.trim() || saving} onClick={handleSaveFilter}>
              {saving ? 'Sparar...' : 'Spara'}
            </Button>
          </PopoverContent>
        </Popover>

        <div className="lg:ml-auto">
          <Button size="sm" className="gap-2 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-5" onClick={() => exportCompaniesCSV(filters)}>
            <Download className="w-4 h-4" /> Exportera CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bolagsnamn</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Stad</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Bransch</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Reg. datum</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td colSpan={7} className="px-5 py-5"><Skeleton className="h-4 w-full" /></td>
                    </tr>
                  ))
                ) : companies.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">Inga bolag hittades.</td></tr>
                ) : (
                  companies.map((c, idx) => {
                    const score = '_score' in c ? (c as any)._score : calculateLeadScore(c);
                    const isEven = idx % 2 === 1;
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/40 ${isEven ? 'bg-muted/15' : ''} ${selectedLead?.id === c.id ? 'border-l-2 border-l-primary bg-accent/30' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedLead(c)} className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors duration-150 cursor-pointer text-left">
                              {c.company_name}
                            </button>
                            {isNewLead(c.registration_date) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Nytt
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">
                          {c.city ? <span className="inline-flex items-center gap-1.5"><MapPin className="w-3 h-3 text-muted-foreground/50" />{c.city}</span> : '—'}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell"><IndustryBadge industry={c.industry_label} /></td>
                        <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            {isNewLead(c.registration_date) && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                            {formatDate(c.registration_date)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center"><ScoreBadge score={score} showTooltip /></td>
                        <td className="px-5 py-4"><LeadStatusBadge status={(c as any).lead_status ?? 'ny'} /></td>
                        <td className="px-5 py-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => setSelectedLead(c)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-all duration-150">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">Visa detaljer</TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </TooltipProvider>
        </div>

        {totalPages >= 1 && !loading && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Visar {rangeStart}–{rangeEnd} av {totalCount} leads</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs gap-1" disabled={page <= 1} onClick={() => updateFilters({ page: page - 1 })}>
                <ChevronLeft className="w-3.5 h-3.5" /> Föregående
              </Button>
              <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs gap-1" disabled={page >= totalPages} onClick={() => updateFilters({ page: page + 1 })}>
                Nästa <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <LeadSlideOver
        company={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onStatusChange={(id, status) => {
          setCompanies(prev => prev.map(c => c.id === id ? { ...c, lead_status: status } as Company : c));
        }}
      />
    </div>
  );
}
