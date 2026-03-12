import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Download, Zap, LogOut, Eye, CreditCard, Settings, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
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

export default function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const avatarColor = useMemo(() => getAvatarColor(user?.email), [user?.email]);
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const displayName = user?.email?.split('@')[0] ?? '';

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-sidebar border-r border-sidebar-border min-h-screen">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Zap className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <span className="text-base font-semibold text-sidebar-accent-foreground tracking-tight">LeadRadar</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(item => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm hover:bg-sidebar-accent transition-colors w-full group">
              <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                {initial}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-sidebar-foreground/60 leading-tight mt-0.5">Pro plan</p>
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
