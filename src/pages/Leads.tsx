import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchCompanies, fetchDistinctCities, fetchDistinctIndustries, calculateLeadScore, exportCompaniesCSV, type LeadFilters, type Company } from '@/lib/api';
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
import { Search, Download, ChevronLeft, ChevronRight, ExternalLink, X, MapPin } from 'lucide-react';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isNewLead(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
}

const PAGE_SIZE = 30;

const COMPANY_FORMS = [
  'Aktiebolag',
  'Enskild firma',
  'Handelsbolag',
  'Kommanditbolag',
  'Ekonomisk förening',
];

export default function Leads() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Company | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  const [filters, setFilters] = useState<LeadFilters>({
    sortBy: 'created_at',
    sortDir: 'desc',
    page: 1,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    Promise.all([fetchDistinctCities(), fetchDistinctIndustries()])
      .then(([c, i]) => { setCities(c); setIndustries(i); });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchCompanies(filters);
      setCompanies(data);
      setTotalCount(count);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateFilters = (partial: Partial<LeadFilters>) => {
    setFilters(prev => ({ ...prev, ...partial, page: partial.page ?? 1 }));
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.industry_label) count++;
    if (filters.city) count++;
    if ((filters as any).company_form) count++;
    return count;
  }, [filters]);

  const clearAllFilters = () => {
    setFilters({
      sortBy: 'created_at',
      sortDir: 'desc',
      page: 1,
      pageSize: PAGE_SIZE,
    });
  };

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
            {!loading && (
              <Badge variant="secondary" className="text-xs font-medium rounded-full px-2.5 py-0.5">
                {totalCount}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Nyregistrerade svenska bolag — uppdateras dagligen
          </p>
        </div>
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
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Rensa filter ({activeFilterCount})
          </button>
        )}

        <div className="lg:ml-auto">
          <Button
            size="sm"
            className="gap-2 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-5"
            onClick={() => exportCompaniesCSV(filters)}
          >
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
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                      Inga bolag hittades.
                    </td>
                  </tr>
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
                            <button
                              onClick={() => setSelectedLead(c)}
                              className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors duration-150 cursor-pointer text-left"
                            >
                              {c.company_name}
                            </button>
                            {isNewLead(c.registration_date) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Nytt
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">
                          {c.city ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-muted-foreground/50" />
                              {c.city}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <IndustryBadge industry={c.industry_label} />
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            {isNewLead(c.registration_date) && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            )}
                            {formatDate(c.registration_date)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <ScoreBadge score={score} />
                        </td>
                        <td className="px-5 py-4">
                          <LeadStatusBadge status={(c as any).lead_status ?? 'ny'} />
                        </td>
                        <td className="px-5 py-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setSelectedLead(c)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-all duration-150"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              Visa detaljer
                            </TooltipContent>
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

        {/* Pagination */}
        {totalPages >= 1 && !loading && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Visar {rangeStart}–{rangeEnd} av {totalCount} leads
            </p>
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
