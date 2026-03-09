import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function AppLayout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-end p-4 md:px-6 lg:px-8">
          <MobileNav />
          <div className="flex-1 md:flex-none" />
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logga ut</span>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 pt-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
