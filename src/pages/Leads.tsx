import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { mockCompanies, type Company, type WebsiteStatus } from '@/lib/mock-data';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Search, SlidersHorizontal, ExternalLink, X } from 'lucide-react';

type SortKey = 'lead_score' | 'registration_date' | 'company_name';

export default function Leads() {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('lead_score');
  const [showFilters, setShowFilters] = useState(false);

  const cities = useMemo(() => [...new Set(mockCompanies.map(c => c.city))].sort(), []);

  const filtered = useMemo(() => {
    let result = [...mockCompanies];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.company_name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.industry_label.toLowerCase().includes(q) ||
        c.org_number.includes(q)
      );
    }

    if (cityFilter) result = result.filter(c => c.city === cityFilter);
    if (websiteFilter) result = result.filter(c => c.website_status === websiteFilter);

    result.sort((a, b) => {
      if (sortBy === 'lead_score') return b.lead_score - a.lead_score;
      if (sortBy === 'registration_date') return new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime();
      return a.company_name.localeCompare(b.company_name);
    });

    return result;
  }, [search, cityFilter, websiteFilter, sortBy]);

  const hasActiveFilters = cityFilter || websiteFilter;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} bolag</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sök bolag, stad, bransch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead_score">Lead score</SelectItem>
              <SelectItem value="registration_date">Nyast först</SelectItem>
              <SelectItem value="company_name">Namn A-Ö</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Stad</label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Alla städer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla städer</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Hemsida</label>
            <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Alla statusar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla statusar</SelectItem>
                <SelectItem value="no_website_found">Ingen hemsida</SelectItem>
                <SelectItem value="social_only">Sociala medier</SelectItem>
                <SelectItem value="has_website">Har hemsida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setCityFilter(''); setWebsiteFilter(''); }}>
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
              {filtered.slice(0, 30).map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.city}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.registration_date}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.industry_label}</td>
                  <td className="px-4 py-3"><WebsiteStatusBadge status={c.website_status} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><PhoneStatusBadge status={c.phone_status} /></td>
                  <td className="px-4 py-3 text-center"><ScoreBadge score={c.lead_score} /></td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/leads/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Visa <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
