import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Database, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Company } from '@/lib/api';
import { calculateLeadScore } from '@/lib/api';

const COLUMN_OPTIONS = [
  { key: 'company_name', label: 'Bolagsnamn' },
  { key: 'city', label: 'Stad' },
  { key: 'industry_label', label: 'Bransch' },
  { key: 'registration_date', label: 'Reg. datum' },
  { key: 'lead_score', label: 'Score' },
  { key: 'lead_status', label: 'Status' },
  { key: 'phone_number', label: 'Telefon' },
  { key: 'website_url', label: 'Hemsida' },
  { key: 'org_number', label: 'Org. nummer' },
  { key: 'website_status', label: 'Webbstatus' },
] as const;

type FilterMode = 'all' | 'new' | 'qualified';

function escapeCSV(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export default function ExportPage() {
  const { user } = useAuth();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(COLUMN_OPTIONS.map(c => c.key))
  );
  const [totalLeads, setTotalLeads] = useState(0);
  const [planName, setPlanName] = useState('Gratis');
  const [exporting, setExporting] = useState(false);
  const [lastExported, setLastExported] = useState<string | null>(
    localStorage.getItem('last_export_date')
  );

  useEffect(() => {
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalLeads(count ?? 0));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('subscriptions')
      .select('plan_tier, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const tier = data[0].plan_tier;
          const label = tier.charAt(0).toUpperCase() + tier.slice(1) + ' plan';
          setPlanName(data[0].status === 'trialing' ? `${label} · Testperiod` : label);
        }
      });
  }, [user]);

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let query = supabase.from('companies').select('*');

      if (filterMode === 'new') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('registration_date', sevenDaysAgo.toISOString().split('T')[0]);
      } else if (filterMode === 'qualified') {
        query = query.eq('lead_status', 'kvalificerad' as any);
      }

      const { data } = await query.order('created_at', { ascending: false }).limit(10000);
      if (!data || data.length === 0) return;

      const cols = COLUMN_OPTIONS.filter(c => selectedColumns.has(c.key));
      const headers = cols.map(c => c.label).join(',');
      const rows = (data as Company[]).map(row => {
        return cols.map(col => {
          if (col.key === 'lead_score') return String(calculateLeadScore(row));
          if (col.key === 'lead_status') return escapeCSV((row as any).lead_status ?? 'ny');
          return escapeCSV((row as any)[col.key]);
        }).join(',');
      });

      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date().toLocaleDateString('sv-SE');
      setLastExported(now);
      localStorage.setItem('last_export_date', now);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Exportera leads</h1>
        <p className="text-muted-foreground mt-1">
          Ladda ner dina leads som CSV för import till ditt CRM
        </p>
      </div>

      {/* Export card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Filter mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Välj vilka leads att exportera</label>
            <Select value={filterMode} onValueChange={v => setFilterMode(v as FilterMode)}>
              <SelectTrigger className="w-full sm:w-64 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla leads</SelectItem>
                <SelectItem value="new">Endast nya (senaste 7 dagarna)</SelectItem>
                <SelectItem value="qualified">Endast kvalificerade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Välj kolumner att inkludera</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {COLUMN_OPTIONS.map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={selectedColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  <span className="text-sm text-foreground">{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Download button */}
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2"
            onClick={handleExport}
            disabled={exporting || selectedColumns.size === 0}
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporterar...' : 'Ladda ner CSV'}
          </Button>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalLeads.toLocaleString('sv-SE')}</p>
              <p className="text-xs text-muted-foreground">Totalt antal leads</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{lastExported ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Senast exporterat</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{planName}</p>
              <p className="text-xs text-muted-foreground">Din plan</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
