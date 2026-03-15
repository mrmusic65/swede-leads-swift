import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Download, Zap, LogOut, Eye, CreditCard, Settings, ChevronsUpDown, KanbanSquare, BarChart2, Users2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserTeam } from '@/lib/team-api';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const sections = [
  {
    label: 'ÖVERSIKT',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'ARBETSYTA',
    items: [
      { to: '/leads', label: 'Leads', icon: Users, badgeKey: 'leads' as const },
      { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
      { to: '/watchlists', label: 'Bevakningar', icon: Eye, badgeKey: 'watchlists' as const },
      { to: '/export', label: 'Exportera', icon: Download },
      { to: '/statistics', label: 'Statistik', icon: BarChart2 },
    ],
  },
];

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ['sidebar-subscription', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('subscriptions')
        .select('plan_tier, status')
        .eq('user_id', user!.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data as { plan_tier: string; status: string } | null;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['sidebar-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', user!.id)
        .single();
      return data as { full_name: string | null; display_name: string | null } | null;
    },
  });

  const { data: team } = useQuery({
    queryKey: ['sidebar-team', user?.id],
    enabled: !!user,
    queryFn: fetchUserTeam,
  });

  const { data: leadsCount } = useQuery({
    queryKey: ['sidebar-leads-count'],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('companies')
        .select('id', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: watchlistsCount } = useQuery({
    queryKey: ['sidebar-watchlists-count'],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('saved_watchlists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count ?? 0;
    },
  });

  const badgeCounts: Record<string, number> = {
    leads: leadsCount ?? 0,
    watchlists: watchlistsCount ?? 0,
  };

  const planLabel = subscription
    ? TIER_LABELS[subscription.plan_tier] ?? subscription.plan_tier
    : 'Gratis';

  const displayName = profile?.display_name || profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const NavItem = ({ item }: { item: typeof sections[0]['items'][0] }) => {
    const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
    const badge = (item as any).badgeKey ? badgeCounts[(item as any).badgeKey] : undefined;

    const content = (
      <Link
        to={item.to}
        className={`relative flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150 group ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
        } ${
          active
            ? 'bg-[hsl(174_50%_50%/0.08)] text-[hsl(174_50%_40%)]'
            : 'text-[hsl(220_10%_55%)] hover:bg-[hsl(0_0%_100%/0.05)] hover:text-[hsl(220_10%_75%)]'
        }`}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[hsl(174_50%_45%)]" />
        )}
        <item.icon className="shrink-0" style={{ width: 18, height: 18, strokeWidth: 1.5 }} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[hsl(174_50%_45%/0.12)] text-[hsl(174_50%_40%)]">
                {badge > 999 ? '999+' : badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
            {badge !== undefined && badge > 0 ? ` (${badge})` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={`hidden lg:flex flex-col min-h-screen transition-all duration-200 relative ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{
        background: 'linear-gradient(180deg, hsl(224 30% 8%) 0%, hsl(224 35% 5%) 100%)',
      }}
    >
      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full border border-[hsl(220_15%_20%)] bg-[hsl(224_30%_10%)] flex items-center justify-center text-[hsl(220_10%_55%)] hover:text-[hsl(220_10%_80%)] hover:bg-[hsl(224_30%_14%)] transition-all duration-150 shadow-md"
      >
        {collapsed ? <ChevronRight style={{ width: 14, height: 14, strokeWidth: 1.5 }} /> : <ChevronLeft style={{ width: 14, height: 14, strokeWidth: 1.5 }} />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-2.5 py-5 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-lg shadow-sidebar-primary/20 shrink-0">
          <Zap className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span
            className="text-base font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, hsl(174 50% 50%), hsl(220 70% 55%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            LeadRadar
          </span>
        )}
      </div>

      {/* Team badge */}
      {team && !collapsed && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(220_20%_12%)] border border-[hsl(220_15%_18%)]">
            <Users2 className="w-3 h-3 text-[hsl(174_50%_45%)] shrink-0" style={{ strokeWidth: 1.5 }} />
            <span className="text-[11px] font-medium text-[hsl(220_10%_70%)] truncate">{team.name}</span>
          </div>
        </div>
      )}
      {team && collapsed && (
        <div className="px-2 pb-3 flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 rounded-full bg-[hsl(220_20%_12%)] border border-[hsl(220_15%_18%)] flex items-center justify-center">
                <Users2 className="w-3.5 h-3.5 text-[hsl(174_50%_45%)]" style={{ strokeWidth: 1.5 }} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{team.name}</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 px-2 py-2 space-y-4">
        {sections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-[hsl(220_10%_40%)] uppercase">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Separator + User profile */}
      <div className={`border-t border-[hsl(220_15%_14%)] ${collapsed ? 'px-2' : 'px-3'} py-3`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-3 rounded-lg text-sm hover:bg-[hsl(0_0%_100%/0.05)] transition-all duration-150 w-full group ${
              collapsed ? 'justify-center p-2' : 'px-2.5 py-2'
            }`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ring-2 ring-white/10"
                style={{
                  background: 'linear-gradient(135deg, hsl(174 50% 45%), hsl(220 70% 50%))',
                }}
              >
                {initials}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-[hsl(220_10%_85%)] truncate leading-tight">{displayName}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[hsl(174_50%_45%/0.12)] text-[hsl(174_50%_50%)]">
                      {planLabel}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 shrink-0 text-[hsl(220_10%_40%)] group-hover:text-[hsl(220_10%_60%)] transition-colors" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align={collapsed ? 'center' : 'start'} className="w-56 p-1.5">
            <DropdownMenuLabel className="px-2.5 py-2">
              <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="px-2.5 py-2.5 rounded-md cursor-pointer">
              <Link to="/subscription" className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span>Prenumeration</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="px-2.5 py-2.5 rounded-md cursor-pointer">
              <Link to="/settings" className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Inställningar</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="px-2.5 py-2.5 rounded-md cursor-pointer flex items-center gap-3">
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <span>Logga ut</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
