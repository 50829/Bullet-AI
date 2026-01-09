// app/main/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { isGuestMode } from '../../lib/guestAuth';
import { MainLayout } from '../components/layout/MainLayout';
import MomentsPage from '../moments/page';
import GoalsPage from '../goals/page';
import ReflectionsPage from '../reflections/page';
import MonthlyRecommendationPage from '../monthly-recommendation/page'; // 新增导入

function InnerPage({ activePage }: { activePage: string }) {
  switch (activePage) {
    case 'monthly-recommendation': // 新增路由
      return <MonthlyRecommendationPage />;
    case 'goals':
      return <GoalsPage />;
    case 'reflections':
      return <ReflectionsPage />;
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
      // 如果是游客模式，允许访问
      if (isGuestMode()) {
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && !session) {
        router.push('/login');
      }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // 如果是游客模式，不检查session
      if (isGuestMode()) {
        return;
      }
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