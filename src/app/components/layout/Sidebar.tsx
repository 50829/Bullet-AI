// src/components/layout/Sidebar.tsx
"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Target, Lightbulb, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext'; // 添加语言Hook

type NavItemProps = {
  page: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void; // 添加可选的 onClick 属性
  className?: string; // 添加可选的 className 属性
  style?: React.CSSProperties; // 添加可选的 style 属性
};

const NavItem = ({ page, icon, label, onClick, className, style }: NavItemProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 修复：当没有page参数时，默认为home
  const currentActivePage = searchParams.get('page') || 'home';
  const isActive = currentActivePage === page;

  const handleClick = () => {
    router.push(`/dashboard?page=${page}`);
    onClick?.();
  };

  return (
    <li>
      <button
        type="button"
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 motion-reduce:transition-none ${
        isActive 
          ? 'bg-[var(--color-bg-primary)] text-[var(--color-primary)]' 
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)]'
      } ${className || ''}`}
        onClick={handleClick}
        title={label}
        aria-label={label}
        style={style}
      >
        {icon}
      </button>
    </li>
  );
};

export const Sidebar = () => {
  const { t } = useLanguage(); // 获取翻译函数
  
  const navItems = [
    { page: 'home', label: t("today") || 'Today', icon: <Home size={20} /> },
    { page: 'moments', label: t("records") || t("moments") || 'Records', icon: <Camera size={20} /> },
    { page: 'goals', label: t("goals") || 'Goals', icon: <Target size={20} /> },
    { page: 'reflections', label: t("insights") || 'Insights', icon: <Lightbulb size={20} /> },
  ];

  return (
    <aside 
      className="fixed left-4 top-20 z-30 hidden rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-sm lg:block"
    >
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.page} {...item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};
