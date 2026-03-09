import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X, Save, Trash2, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { fetchDistinctCities, fetchDistinctCounties, fetchDistinctIndustries, fetchSavedFilters, createSavedFilter, deleteSavedFilter, type LeadFilters, type SavedFilter } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

interface Props {
  filters: LeadFilters;
  onChange: (filters: Partial<LeadFilters>) => void;
  onClear: () => void;
}

export default function LeadFiltersPanel({ filters, onChange, onClear }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cities, setCities] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    Promise.all([fetchDistinctCities(), fetchDistinctCounties(), fetchDistinctIndustries()])
      .then(([c, co, i]) => { setCities(c); setCounties(co); setIndustries(i); });
  }, []);

  useEffect(() => {
    if (user) {
      fetchSavedFilters(user.id).then(setSavedFilters).catch(() => {});
    }
  }, [user]);

  const handleSaveFilter = async () => {
    if (!user || !filterName.trim()) return;
    try {
      const sf = await createSavedFilter(user.id, filterName, filters);
      setSavedFilters(prev => [sf, ...prev]);
      setFilterName('');
      setShowSave(false);
      toast({ title: 'Filter sparat' });
    } catch {
      toast({ title: 'Kunde inte spara', variant: 'destructive' });
    }
  };

  const handleDeleteFilter = async (id: string) => {
    try {
      await deleteSavedFilter(id);
      setSavedFilters(prev => prev.filter(f => f.id !== id));
    } catch {
      toast({ title: 'Kunde inte radera', variant: 'destructive' });
    }
  };

  const handleLoadFilter = (sf: SavedFilter) => {
    const loaded = sf.filter_json as unknown as LeadFilters;
    onChange(loaded);
  };

  const scoreRange = [filters.minScore ?? 0, filters.maxScore ?? 100];

  const hasActive = filters.city || filters.county || filters.website_status || filters.phone_status || filters.industry_label || filters.minScore || (filters.maxScore != null && filters.maxScore < 100) || filters.registeredAfter || filters.registeredBefore;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FilterSelect label="Stad" value={filters.city} placeholder="Alla städer" options={cities} onChange={v => onChange({ city: v || undefined })} />
        <FilterSelect label="Län" value={filters.county} placeholder="Alla län" options={counties} onChange={v => onChange({ county: v || undefined })} />
        <FilterSelect label="Bransch" value={filters.industry_label} placeholder="Alla branscher" options={industries} onChange={v => onChange({ industry_label: v || undefined })} />
        <FilterSelect label="Hemsida" value={filters.website_status} placeholder="Alla statusar" options={[
          { value: 'no_website_found', label: 'Ingen hemsida' },
          { value: 'social_only', label: 'Sociala medier' },
          { value: 'has_website', label: 'Har hemsida' },
        ]} onChange={v => onChange({ website_status: v || undefined })} />
        <FilterSelect label="Telefon" value={filters.phone_status} placeholder="Alla statusar" options={[
          { value: 'has_phone', label: 'Har telefon' },
          { value: 'missing', label: 'Saknas' },
          { value: 'unknown', label: 'Okänd' },
        ]} onChange={v => onChange({ phone_status: v || undefined })} />
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Reg. datum från</label>
          <DatePicker value={filters.registeredAfter} onChange={v => onChange({ registeredAfter: v })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Reg. datum till</label>
          <DatePicker value={filters.registeredBefore} onChange={v => onChange({ registeredBefore: v })} />
        </div>

        <div className="space-y-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Lead score: {scoreRange[0]}–{scoreRange[1]}</label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={scoreRange}
            onValueChange={([min, max]) => onChange({ minScore: min > 0 ? min : undefined, maxScore: max < 100 ? max : undefined })}
            className="mt-2"
          />
        </div>

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="w-3 h-3 mr-1" /> Rensa
          </Button>
        )}
      </div>

      {/* Saved filters */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <BookmarkCheck className="w-4 h-4 text-muted-foreground" />
        {savedFilters.map(sf => (
          <div key={sf.id} className="inline-flex items-center gap-1 bg-secondary rounded-md px-2 py-1">
            <button className="text-xs font-medium hover:text-primary transition-colors" onClick={() => handleLoadFilter(sf)}>
              {sf.name}
            </button>
            <button onClick={() => handleDeleteFilter(sf.id)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {showSave ? (
          <div className="inline-flex items-center gap-1">
            <Input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Filternamn..." className="h-7 w-32 text-xs" onKeyDown={e => e.key === 'Enter' && handleSaveFilter()} />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleSaveFilter} disabled={!filterName.trim()}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowSave(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSave(true)}>
            <Save className="w-3 h-3 mr-1" /> Spara filter
          </Button>
        )}
      </div>
    </Card>
  );
}

function FilterSelect({ label, value, placeholder, options, onChange }: {
  label: string;
  value?: string;
  placeholder: string;
  options: string[] | { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger className="w-40"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">{placeholder}</SelectItem>
          {options.map(o => {
            const val = typeof o === 'string' ? o : o.value;
            const lab = typeof o === 'string' ? o : o.label;
            return <SelectItem key={val} value={val}>{lab}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function DatePicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const date = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-36 justify-start text-left font-normal h-9 text-xs", !date && "text-muted-foreground")}>
          <CalendarIcon className="w-3 h-3 mr-1.5" />
          {date ? format(date, 'yyyy-MM-dd') : 'Välj datum'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={d => onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
