import { getDashboardStats } from '@/lib/mock-data';
import { Building2, Globe, Share2, TrendingUp, BarChart3, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stats = getDashboardStats();

const kpiCards = [
  { label: 'Nya bolag (30 dagar)', value: stats.newLast30, icon: Building2, color: 'text-primary' },
  { label: 'Utan hemsida', value: stats.noWebsite, icon: Globe, color: 'text-destructive' },
  { label: 'Bara sociala medier', value: stats.socialOnly, icon: Share2, color: 'text-warning' },
  { label: 'Högsta lead score', value: stats.highestScore, icon: TrendingUp, color: 'text-success' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Översikt över svenska leads</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Topp branscher
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topIndustries.map(ind => (
              <div key={ind.name} className="flex items-center justify-between">
                <span className="text-sm">{ind.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(ind.count / stats.topIndustries[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-6 text-right">{ind.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Topp städer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topCities.map(city => (
              <div key={city.name} className="flex items-center justify-between">
                <span className="text-sm">{city.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(city.count / stats.topCities[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-6 text-right">{city.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
