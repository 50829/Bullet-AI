// app/main/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { MainLayout } from '../components/layout/MainLayout';
import MomentsPage from '../moments/page';
import GoalsPage from '../goals/page';
import ReflectionsPage from '../reflections/page';
import HomePage from '../components/HomePage';

function InnerPage({ activePage }: { activePage: string }) {
  switch (activePage) {
    case 'home':
      return <HomePage />;
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
        router.push('/login');
        return;
      }
      
      // 检查是否有昵称
      if (mounted && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", session.user.id)
          .single();
        
        if (!profile?.username) {
          router.push('/username');
        }
      }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        // 检查是否有昵称
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", session.user.id)
          .single();
        
        if (!profile?.username) {
          router.push('/username');
        }
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