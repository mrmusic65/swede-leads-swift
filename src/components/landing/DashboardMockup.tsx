import { Users, Bell, TrendingUp, Filter } from 'lucide-react';

export default function DashboardMockup() {
  return (
    <div className="w-full max-w-[520px] rounded-2xl shadow-2xl shadow-black/8 border border-black/[0.06] overflow-hidden bg-white">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.06]" style={{ background: '#fafaf8' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e2db' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e2db' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e2db' }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 rounded-md text-[10px] font-medium" style={{ background: '#efece6', color: '#8a8578' }}>
            app.leadradar.se/dashboard
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Nya leads', value: '847', icon: Users, trend: '+12%' },
            { label: 'Bevakningar', value: '6', icon: Bell, trend: 'aktiva' },
            { label: 'Score >70', value: '234', icon: TrendingUp, trend: '28%' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 border border-black/[0.05]" style={{ background: '#fafaf8' }}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-3.5 h-3.5" style={{ color: '#9a9488' }} />
                <span className="text-[9px] font-medium" style={{ color: '#2d9f8f' }}>{s.trend}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: '#2c2a25' }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: '#9a9488' }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-black/[0.05] p-4" style={{ background: '#fafaf8' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: '#2c2a25' }}>Leads per vecka</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px]" style={{ background: '#efece6', color: '#8a8578' }}>
              <Filter className="w-2.5 h-2.5" /> Filter
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {[35, 50, 42, 68, 55, 72, 60, 85, 78, 92, 88, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${h}%`,
                  background: i >= 10 ? '#2d9f8f' : i >= 8 ? '#5ec4b6' : '#ddd9d0',
                }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-black/[0.05] overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[9px] font-semibold" style={{ background: '#fafaf8', color: '#9a9488' }}>
            <span>Företag</span><span>Bransch</span><span>Score</span><span>Status</span>
          </div>
          {[
            { name: 'Teknik Nord AB', industry: 'IT', score: 92, status: 'Ny' },
            { name: 'Bygg & Fasad', industry: 'Bygg', score: 78, status: 'Kontaktad' },
            { name: 'Grön Energi AB', industry: 'Energi', score: 85, status: 'Ny' },
          ].map((r) => (
            <div key={r.name} className="grid grid-cols-4 gap-2 px-3 py-2.5 border-t border-black/[0.04] text-[10px]" style={{ color: '#2c2a25' }}>
              <span className="font-medium truncate">{r.name}</span>
              <span style={{ color: '#9a9488' }}>{r.industry}</span>
              <span className="font-semibold" style={{ color: '#2d9f8f' }}>{r.score}</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-medium w-fit" style={{
                background: r.status === 'Ny' ? '#e8f5f2' : '#efece6',
                color: r.status === 'Ny' ? '#2d9f8f' : '#8a8578',
              }}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
