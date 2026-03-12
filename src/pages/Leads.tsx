import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompanies, fetchDistinctCities, fetchDistinctIndustries, calculateLeadScore, exportCompaniesCSV, type LeadFilters, type Company } from '@/lib/api';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

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

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads</h1>
        <p className="text-muted-foreground mt-1">
          Nyregistrerade svenska bolag — uppdateras dagligen
        </p>
      </div>

      {/* Filter row */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 min-w-0 w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sök bolag, stad, bransch..."
            value={filters.search ?? ''}
            onChange={e => updateFilters({ search: e.target.value || undefined })}
            className="pl-9 h-9"
          />
        </div>

        <Select value={filters.industry_label ?? ''} onValueChange={v => updateFilters({ industry_label: v || undefined })}>
          <SelectTrigger className="w-full md:w-44 h-9">
            <SelectValue placeholder="Bransch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alla branscher</SelectItem>
            {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.city ?? ''} onValueChange={v => updateFilters({ city: v || undefined })}>
          <SelectTrigger className="w-full md:w-40 h-9">
            <SelectValue placeholder="Stad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alla städer</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={(filters as any).company_form ?? ''}
          onValueChange={v => updateFilters({ ...(v ? { company_form: v } : { company_form: undefined }) } as any)}
        >
          <SelectTrigger className="w-full md:w-44 h-9">
            <SelectValue placeholder="Bolagsform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alla bolagsformer</SelectItem>
            {COMPANY_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => exportCompaniesCSV(filters)}>
            <Download className="w-3.5 h-3.5" /> Exportera CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Bolagsnamn</th>
                <th className="text-left px-5 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Stad</th>
                <th className="text-left px-5 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Bransch</th>
                <th className="text-left px-5 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Reg. datum</th>
                <th className="text-center px-5 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                <th className="text-left px-5 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="px-5 py-4"></th>
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
                companies.map(c => {
                  const score = '_score' in c ? (c as any)._score : calculateLeadScore(c);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-5 font-medium text-foreground">
                        {c.company_name}
                      </td>
                      <td className="px-5 py-5 text-muted-foreground hidden sm:table-cell">
                        {c.city || '—'}
                      </td>
                      <td className="px-5 py-5 text-muted-foreground hidden md:table-cell">
                        {c.industry_label || '—'}
                      </td>
                      <td className="px-5 py-5 text-muted-foreground hidden lg:table-cell">
                        {c.registration_date || '—'}
                      </td>
                      <td className="px-5 py-5 text-center">
                        <ScoreBadge score={score} />
                      </td>
                      <td className="px-5 py-5">
                        <WebsiteStatusBadge status={c.website_status} />
                      </td>
                      <td className="px-5 py-5">
                        <Link
                          to={`/leads/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Visa <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Sida {page} av {totalPages} · {totalCount} bolag totalt
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => updateFilters({ page: page - 1 })}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => updateFilters({ page: page + 1 })}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
