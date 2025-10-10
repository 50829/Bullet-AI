// app/main/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { MainLayout } from '../components/layout/MainLayout';
import MomentsPage from '../moments/page';
import GoalsPage from '../goals/page';
import ReflectionsPage from '../reflections/page';
import AICompanionPage from '../ai-companion/page';
import MonthlyRecommendationPage from '../monthly-recommendation/page'; // 新增导入

function InnerPage({ activePage }: { activePage: string }) {
  switch (activePage) {
    case 'monthly-recommendation': // 新增路由
      return <MonthlyRecommendationPage />;
    case 'goals':
      return <GoalsPage />;
    case 'reflections':
      return <ReflectionsPage />;
    case 'ai-companion':
      return <AICompanionPage />;
    case 'moments':
    default:
      return <MomentsPage />;
  }
}

export default function MainDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePage, setActivePage] = useState('monthly-recommendation');

  useEffect(() => {
    const page = searchParams.get('page') || 'monthly-recommendation';
    if (page !== activePage) setActivePage(page);
  }, [searchParams, activePage]);

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && !session) {
        router.push('/login');
      }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login');
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <MainLayout>
      <InnerPage activePage={activePage} />
    </MainLayout>
  );
}