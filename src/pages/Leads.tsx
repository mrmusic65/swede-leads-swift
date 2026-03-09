import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompanies, fetchDistinctCities, fetchDistinctIndustries, calculateLeadScore, exportCompaniesCSV, type LeadFilters, type Company } from '@/lib/api';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';
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
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'registration_date' | 'company_name' | 'created_at'>('created_at');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  // Check for highlighted import IDs on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('highlight_import_ids');
    if (stored) {
      try {
        const ids: string[] = JSON.parse(stored);
        setHighlightIds(new Set(ids));
        // Clear after 10 seconds
        const timer = setTimeout(() => {
          setHighlightIds(new Set());
          sessionStorage.removeItem('highlight_import_ids');
        }, 10000);
        return () => clearTimeout(timer);
      } catch {
        sessionStorage.removeItem('highlight_import_ids');
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchDistinctCities(), fetchDistinctIndustries()]).then(([c, i]) => { setCities(c); setIndustries(i); });
  }, []);

  const filters: LeadFilters = {
    search: search || undefined,
    city: cityFilter || undefined,
    website_status: websiteFilter || undefined,
    industry_label: industryFilter || undefined,
    sortBy,
    sortDir: sortBy === 'company_name' ? 'asc' : 'desc',
    page,
    pageSize: PAGE_SIZE,
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchCompanies(filters);
      setCompanies(data);
      setTotalCount(count);
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter, websiteFilter, industryFilter, sortBy, page]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, cityFilter, websiteFilter, industryFilter, sortBy]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = cityFilter || websiteFilter || industryFilter;

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
          <Input placeholder="Sök bolag, stad, bransch..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Nyast först</SelectItem>
              <SelectItem value="registration_date">Reg. datum</SelectItem>
              <SelectItem value="company_name">Namn A-Ö</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showFilters ? 'default' : 'outline'} size="icon" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Stad</label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Alla städer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla städer</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Bransch</label>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Alla branscher" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla branscher</SelectItem>
                {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Hemsida</label>
            <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Alla statusar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla statusar</SelectItem>
                <SelectItem value="no_website_found">Ingen hemsida</SelectItem>
                <SelectItem value="social_only">Sociala medier</SelectItem>
                <SelectItem value="has_website">Har hemsida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setCityFilter(''); setWebsiteFilter(''); setIndustryFilter(''); }}>
              <X className="w-3 h-3 mr-1" /> Rensa
            </Button>
          )}
        </Card>
      )}

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
                companies.map(c => (
                  <tr key={c.id} className={`border-b last:border-0 transition-colors ${
                    highlightIds.has(c.id)
                      ? 'bg-accent/50 animate-fade-in'
                      : 'hover:bg-muted/30'
                  }`}>
                    <td className="px-4 py-3 font-medium">
                      {highlightIds.has(c.id) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2" />}
                      {c.company_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.city}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.registration_date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.industry_label}</td>
                    <td className="px-4 py-3"><WebsiteStatusBadge status={c.website_status} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><PhoneStatusBadge status={c.phone_status} /></td>
                    <td className="px-4 py-3 text-center"><ScoreBadge score={calculateLeadScore(c)} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/leads/${c.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Visa <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">Sida {page} av {totalPages}</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
