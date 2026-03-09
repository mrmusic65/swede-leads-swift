import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompanies, calculateLeadScore, exportCompaniesCSV, type LeadFilters, type Company } from '@/lib/api';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';
import LeadFiltersPanel from '@/components/LeadFiltersPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SlidersHorizontal, ExternalLink, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const PAGE_SIZE = 30;

export default function Leads() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<LeadFilters>({
    sortBy: 'created_at',
    sortDir: 'desc',
    page: 1,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('highlight_import_ids');
    if (stored) {
      try {
        setHighlightIds(new Set(JSON.parse(stored)));
        const timer = setTimeout(() => { setHighlightIds(new Set()); sessionStorage.removeItem('highlight_import_ids'); }, 10000);
        return () => clearTimeout(timer);
      } catch { sessionStorage.removeItem('highlight_import_ids'); }
    }
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

  const clearFilters = () => {
    setFilters({ sortBy: filters.sortBy, sortDir: filters.sortDir, page: 1, pageSize: PAGE_SIZE, search: filters.search });
  };

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const sortBy = filters.sortBy ?? 'created_at';

  return (
    <div className="space-y-4 animate-fade-in">
      {highlightIds.size > 0 && (
        <div className="bg-accent border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-accent-foreground">
            <span className="font-semibold">{highlightIds.size} nya leads</span> importerade och markerade nedan
          </p>
          <Button variant="ghost" size="sm" onClick={() => { setHighlightIds(new Set()); sessionStorage.removeItem('highlight_import_ids'); }}>
            <X className="w-3 h-3 mr-1" /> Stäng
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalCount} bolag</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCompaniesCSV(filters)}>
          <Download className="w-3.5 h-3.5" /> Exportera
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Sök bolag, stad, bransch..." value={filters.search ?? ''} onChange={e => updateFilters({ search: e.target.value || undefined })} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={v => updateFilters({ sortBy: v as any, sortDir: v === 'company_name' ? 'asc' : 'desc' })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Nyast först</SelectItem>
              <SelectItem value="registration_date">Reg. datum</SelectItem>
              <SelectItem value="company_name">Namn A-Ö</SelectItem>
              <SelectItem value="lead_score">Lead score ↓</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showFilters ? 'default' : 'outline'} size="icon" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showFilters && <LeadFiltersPanel filters={filters} onChange={updateFilters} onClear={clearFilters} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bolag</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Stad</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Reg. datum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Bransch</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hemsida</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Telefon</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : companies.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Inga bolag hittades.</td></tr>
              ) : (
                companies.map(c => {
                  const score = '_score' in c ? (c as any)._score : calculateLeadScore(c);
                  return (
                    <tr key={c.id} className={`border-b last:border-0 transition-colors ${highlightIds.has(c.id) ? 'bg-accent/50 animate-fade-in' : 'hover:bg-muted/30'}`}>
                      <td className="px-4 py-3 font-medium">
                        {highlightIds.has(c.id) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2" />}
                        {c.company_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.city}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.registration_date}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.industry_label}</td>
                      <td className="px-4 py-3"><WebsiteStatusBadge status={c.website_status} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><PhoneStatusBadge status={c.phone_status} /></td>
                      <td className="px-4 py-3 text-center"><ScoreBadge score={score} /></td>
                      <td className="px-4 py-3">
                        <Link to={`/leads/${c.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">Sida {page} av {totalPages}</p>
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
      </Card>
    </div>
  );
}
