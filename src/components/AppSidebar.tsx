import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Download, Zap, LogOut, Eye, CreditCard, Settings, ChevronsUpDown, KanbanSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { to: '/watchlists', label: 'Bevakningar', icon: Eye },
  { to: '/export', label: 'Exportera', icon: Download },
];

const AVATAR_COLORS = [
  'bg-orange-600', 'bg-sky-600', 'bg-emerald-600', 'bg-violet-600',
  'bg-rose-600', 'bg-amber-600', 'bg-teal-600', 'bg-indigo-600',
];

function getAvatarColor(email: string | undefined) {
  if (!email) return AVATAR_COLORS[0];
  const code = email.charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();

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
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .single();
      return data;
    },
  });

  const planLabel = subscription
    ? `${TIER_LABELS[subscription.plan_tier] ?? subscription.plan_tier} plan`
    : 'Gratis';

  const avatarColor = useMemo(() => getAvatarColor(user?.email), [user?.email]);
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen"
      style={{
        background: 'linear-gradient(180deg, hsl(224 30% 8%) 0%, hsl(224 35% 5%) 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
          <Zap className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <span className="text-base font-bold text-sidebar-accent-foreground tracking-tight">LeadRadar</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(item => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-sidebar-primary/10 text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-sidebar-primary" />
              )}
              <item.icon className={`w-4 h-4 ${active ? 'text-sidebar-primary' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm hover:bg-sidebar-accent transition-all duration-150 w-full group">
              <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-white/10`}>
                {initial}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-sidebar-foreground/60 leading-tight mt-0.5">{planLabel}</p>
              </div>
              <ChevronsUpDown className="w-4 h-4 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60 p-1.5">
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
