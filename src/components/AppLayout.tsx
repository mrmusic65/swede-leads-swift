import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';
import OnboardingModal from './OnboardingModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function AppLayout() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('profiles').select('display_name').eq('id', user.id).single()
      .then(({ data }: any) => {
        if (!data?.display_name) setShowOnboarding(true);
        setChecked(true);
      });
  }, [user]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 border-l border-border">
        <div className="lg:hidden">
          <MobileNav />
        </div>
        <main
          className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 85% 10%, hsl(205 100% 97% / 0.6), transparent 70%),
              linear-gradient(180deg, hsl(40 10% 98%) 0%, hsl(225 14% 97%) 100%)
            `,
          }}
        >
          <Outlet />
        </main>
      </div>
      {checked && showOnboarding && user && (
        <OnboardingModal
          userId={user.id}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
