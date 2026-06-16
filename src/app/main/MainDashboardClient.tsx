// app/main/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { MainLayout } from '../components/layout/MainLayout';
import MomentsPageClient from '../moments/MomentsPageClient';
import GoalsPageClient from '../goals/GoalsPageClient';
import ReflectionsPageClient from '../reflections/ReflectionsPageClient';
import HomePage from '../components/HomePage';

function InnerPage({ activePage }: { activePage: string }) {
  switch (activePage) {
    case 'home':
      return <HomePage />;
    case 'goals':
      return <GoalsPageClient />;
    case 'reflections':
      return <ReflectionsPageClient />;
    case 'moments':
    default:
      return <MomentsPageClient />;
  }
}

export default function MainDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePage, setActivePage] = useState('home');

  useEffect(() => {
    const page = searchParams.get('page') || 'home';
    if (page !== activePage) setActivePage(page);
  }, [searchParams, activePage]);

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && !session) {
        router.replace('/login');
      }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
      }
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
