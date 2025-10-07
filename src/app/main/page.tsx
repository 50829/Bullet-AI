// app/main/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { MainLayout } from '../components/layout/MainLayout';
// 导入各个页面组件
import MomentsPage from '../moments/page';
import GoalsPage from '../goals/page';
import ReflectionsPage from '../reflections/page';
import AICompanionPage from '../ai-companion/page';

export default function MainDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePage, setActivePage] = useState('moments');
  
  useEffect(() => {
    // 从 URL 参数获取当前页面
    const page = searchParams.get('page') || 'moments';
    setActivePage(page);
    
    // 检查用户是否已登录
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };

    checkSession();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const renderPage = () => {
    switch (activePage) {
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
  };

  return (
    <MainLayout>
      {renderPage()}
    </MainLayout>
  );
}