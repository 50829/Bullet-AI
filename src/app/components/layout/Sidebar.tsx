"use client"; // This component needs to be a Client Component

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Heart, Target, MessageSquare, BrainCircuit } from 'lucide-react';

type NavItemProps = {
  page: string;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ page, icon, label }: NavItemProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isActive = searchParams.get('page') === page;

  const handleClick = () => {
    router.push(`/main?page=${page}`);
  };

  return (
    <li
      className={`flex items-center p-3 my-2 cursor-pointer rounded-lg transition-colors ${
        isActive ? 'bg-red-100 text-red-600' : 'text-gray-600 hover:bg-gray-100'
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
    { page: 'moments', label: '我的时刻', icon: <Heart size={20} /> },
    { page: 'goals', label: '我的目标', icon: <Target size={20} /> },
    { page: 'reflections', label: '我的感悟', icon: <BrainCircuit size={20} /> },
    { page: 'ai-companion', label: 'AI树洞', icon: <MessageSquare size={20} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col shrink-0">
      <div className="flex items-center mb-8">
        <div className="bg-red-500 p-2 rounded-full">
          <Heart size={24} className="text-white" />
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
      <div className="mt-auto text-xs text-gray-400">
        每一个灵魂，都值得被记录
      </div>
    </aside>
  );
};