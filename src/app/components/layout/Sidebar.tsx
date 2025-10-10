// src/components/layout/Sidebar.tsx
"use client";

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Heart, Target, MessageSquare, BrainCircuit, Sparkles, Calendar } from 'lucide-react';

type NavItemProps = {
  page: string;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ page, icon, label }: NavItemProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 修复：当没有page参数时，默认为monthly-recommendation
  const currentActivePage = searchParams.get('page') || 'monthly-recommendation';
  const isActive = currentActivePage === page;

  const handleClick = () => {
    router.push(`/main?page=${page}`);
  };

  return (
    <li
      className={`flex items-center p-3 my-2 cursor-pointer rounded-lg transition-colors ${
        isActive ? 'bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 text-orange-400 shadow-lg border border-orange-200' : 'text-gray-600 hover:bg-gradient-to-br hover:from-blue-100/50 hover:via-white/50 hover:to-orange-100/50 hover:shadow-sm'
      }`}
      onClick={handleClick}
    >
      {icon}
      <span className="ml-4 font-medium">{label}</span>
    </li>
  );
};

export const Sidebar = () => {
  const navItems = [
    { page: 'monthly-recommendation', label: '月度推荐', icon: <Calendar size={20} /> },
    { page: 'moments', label: '我的时刻', icon: <Heart size={20} /> },
    { page: 'goals', label: '我的目标', icon: <Target size={20} /> },
    { page: 'reflections', label: '我的感悟', icon: <BrainCircuit size={20} /> },
    { page: 'ai-companion', label: 'AI树洞', icon: <MessageSquare size={20} /> },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-100/80 via-white/80 to-orange-100/80 border-r border-orange-200 p-4 flex flex-col shrink-0 shadow-lg">
      <div className="flex items-center mb-8">
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
          <Sparkles size={24} className="text-gray-700" />
        </div>
        <h1 className="ml-3 text-xl font-bold text-gray-800">BulletAI</h1>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <NavItem key={item.page} {...item} />
          ))}
        </ul>
      </nav>
      <div className="mt-auto text-xs text-gray-500">
        每一个灵魂，都值得被记录
      </div>
    </aside>
  );
};