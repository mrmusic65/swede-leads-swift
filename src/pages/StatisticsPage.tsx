import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore, type Company } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, Target, GitBranch } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, CartesianGrid,
} from 'recharts';

const PIPELINE_STAGES = [
  { id: 'new', label: 'Ny', color: '#94a3b8' },
  { id: 'contacted', label: 'Kontaktad', color: '#3b82f6' },
  { id: 'meeting', label: 'Möte bokat', color: '#8b5cf6' },
  { id: 'customer', label: 'Kund', color: '#10b981' },
  { id: 'not_interested', label: 'Ej intressant', color: '#ef4444' },
];

const INDUSTRY_COLORS = [
  '#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9', '#eab308',
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">{children}</h2>;
}

export default function StatisticsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'3' | '6' | '12'>('12');

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('companies').select('*').limit(1000);
      setCompanies(data || []);
      setLoading(false);
    })();
  }, []);

  const scores = useMemo(() => companies.map(c => calculateLeadScore(c)), [companies]);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const recentCount = companies.filter(c => c.created_at && new Date(c.created_at) >= thirtyDaysAgo).length;

  const pipelineCounts = useMemo(() => {
    const m: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => { m[s.id] = 0; });
    companies.forEach(c => {
      const stage = (c as any).pipeline_stage || 'new';
      m[stage] = (m[stage] || 0) + 1;
    });
    return m;
  }, [companies]);

  const pipelineTotal = Object.values(pipelineCounts).reduce((a, b) => a + b, 0);
  const customerRate = pipelineTotal > 0 ? Math.round((pipelineCounts['customer'] / pipelineTotal) * 100) : 0;

  // Monthly data for area chart
  const monthlyData = useMemo(() => {
    const months = parseInt(period);
    const data: { month: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' });
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = companies.filter(c => {
        if (!c.created_at) return false;
        const cd = new Date(c.created_at);
        return cd >= start && cd <= end;
      }).length;
      data.push({ month: label, count });
    }
    return data;
  }, [companies, period]);

  // Industry donut
  const industryData = useMemo(() => {
    const m: Record<string, number> = {};
    companies.forEach(c => {
      const key = c.industry_label || 'Okänd';
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 22) + '…' : name, value, fullName: name }));
  }, [companies]);

  // City bar
  const cityData = useMemo(() => {
    const m: Record<string, number> = {};
    companies.forEach(c => { if (c.city) m[c.city] = (m[c.city] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [companies]);

  const pipelineData = PIPELINE_STAGES.map(s => ({ name: s.label, value: pipelineCounts[s.id] || 0, fill: s.color }));

  const isEmpty = companies.length === 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-[1200px]">
      <h1 className="text-xl font-bold text-foreground">Statistik</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totalt antal leads', value: companies.length, icon: Users, color: 'text-primary' },
          { label: 'Senaste 30 dagarna', value: recentCount, icon: TrendingUp, color: 'text-blue-600' },
          { label: 'Snitt lead score', value: avgScore, icon: Target, color: 'text-amber-500' },
          { label: 'Leads i pipeline', value: pipelineTotal, icon: GitBranch, color: 'text-violet-600' },
        ].map(kpi => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Area chart */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Nya leads per månad</SectionTitle>
          <ToggleGroup type="single" value={period} onValueChange={v => v && setPeriod(v as any)} className="border rounded-lg p-0.5">
            <ToggleGroupItem value="3" className="h-7 px-2.5 text-xs">3M</ToggleGroupItem>
            <ToggleGroupItem value="6" className="h-7 px-2.5 text-xs">6M</ToggleGroupItem>
            <ToggleGroupItem value="12" className="h-7 px-2.5 text-xs">12M</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Card className="border shadow-sm">
          <CardContent className="p-4 h-72">
            {isEmpty ? (
              <EmptyChart text="Data visas när du har leads" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 14%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(224, 10%, 46%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(224, 10%, 46%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(225, 14%, 91%)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" name="Leads" stroke="hsl(172, 66%, 40%)" strokeWidth={2} fill="url(#tealGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <div>
          <SectionTitle>Leads per bransch</SectionTitle>
          <Card className="border shadow-sm">
            <CardContent className="p-4 h-80">
              {isEmpty ? (
                <EmptyChart text="Data visas när du har leads" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="value"
                      paddingAngle={2}
                      label={false}
                    >
                      {industryData.map((_, i) => (
                        <Cell key={i} fill={INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(value: number, _: string, entry: any) => {
                        const pct = ((value / companies.length) * 100).toFixed(1);
                        return [`${value} (${pct}%)`, entry.payload.fullName || entry.payload.name];
                      }}
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(225, 14%, 91%)', fontSize: 12 }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconSize={8}
                      formatter={(value: string, entry: any) => {
                        const item = industryData.find(d => d.name === value);
                        const pct = item ? ((item.value / companies.length) * 100).toFixed(0) : '0';
                        return <span className="text-[11px] text-muted-foreground">{value} ({item?.value}, {pct}%)</span>;
                      }}
                    />
                    {/* Center text */}
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">{companies.length}</text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">totalt</text>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* City bar */}
        <div>
          <SectionTitle>Leads per stad</SectionTitle>
          <Card className="border shadow-sm">
            <CardContent className="p-4 h-80">
              {isEmpty ? (
                <EmptyChart text="Data visas när du har leads" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 14%, 91%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(224, 10%, 46%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(224, 10%, 46%)' }} axisLine={false} tickLine={false} width={80} />
                    <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(225, 14%, 91%)', fontSize: 12 }} />
                    <Bar dataKey="value" name="Leads" fill="hsl(172, 66%, 40%)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pipeline stats */}
      <div>
        <SectionTitle>Pipeline-statistik</SectionTitle>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            {isEmpty ? (
              <div className="h-48"><EmptyChart text="Data visas när du har leads" /></div>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 14%, 91%)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(224, 10%, 46%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(224, 10%, 46%)' }} axisLine={false} tickLine={false} width={100} />
                      <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(225, 14%, 91%)', fontSize: 12 }} />
                      <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]} barSize={24}>
                        {pipelineData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  <span className="font-semibold text-foreground">{customerRate}%</span> av leads når <span className="font-medium text-emerald-600">Kund</span>-steget
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
