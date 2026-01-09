// src/components/layout/Sidebar.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Heart, Target, MessageSquare, BrainCircuit, Sparkles, Calendar, Menu, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext'; // 添加语言Hook

type NavItemProps = {
  page: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void; // 添加可选的 onClick 属性
};

const NavItem = ({ page, icon, label, onClick }: NavItemProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage(); // 获取翻译函数
  
  // 修复：当没有page参数时，默认为monthly-recommendation
  const currentActivePage = searchParams.get('page') || 'monthly-recommendation';
  const isActive = currentActivePage === page;

  const handleClick = () => {
    router.push(`/main?page=${page}`);
    if (onClick) {
      onClick(); // 调用传入的 onClick 回调
    }
  };

  return (
    <li
      className={`flex items-center p-3 my-2 cursor-pointer rounded-lg transition-colors ${
        isActive ? 'bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 text-orange-400 shadow-lg border border-orange-200' : 'text-gray-600 hover:bg-gradient-to-br hover:from-blue-100/50 hover:via-white/50 hover:to-orange-100/50 hover:shadow-sm'
      }`}
      onClick={handleClick}
    >
      {icon}
      {/* 使用 suppressHydrationWarning 来处理语言相关的文本不匹配 */}
      <span className="ml-4 font-medium" suppressHydrationWarning={true}>{label}</span>
    </li>
  );
};

export const Sidebar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLanguage(); // 获取翻译函数
  
  const navItems = [
    { page: 'monthly-recommendation', label: t("monthlyRecommendationNav") || '月度推荐', icon: <Calendar size={20} /> },
    { page: 'moments', label: t("myMomentsNav") || '我的时刻', icon: <Heart size={20} /> },
    { page: 'goals', label: t("myGoalsNav") || '我的目标', icon: <Target size={20} /> },
    { page: 'reflections', label: t("myReflectionsNav") || '我的感悟', icon: <BrainCircuit size={20} /> },
  ];

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px 以下为移动端
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 在移动端默认关闭侧边栏
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 移动端覆盖在主页面上方的侧边栏
  if (isMobile) {
    return (
      <>
        {/* 移动端菜单按钮 - 放在左下角，当侧边栏展开时隐藏 */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed bottom-4 left-4 z-50 p-3 bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-full shadow-lg border border-orange-200 lg:hidden"
            aria-label={t("toggleMenu") || "切换菜单"}
          >
            <Menu size={24} />
          </button>
        )}

        {/* 移动端侧边栏覆盖层 */}
        {isSidebarOpen && (
          <>
            {/* 遮罩层 */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={toggleSidebar}
            />
            
            {/* 侧边栏内容 */}
            <aside className="fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-100/80 via-white/80 to-orange-100/80 border-r border-orange-200 p-4 flex flex-col z-50 shadow-lg lg:hidden transform translate-x-0 transition-transform duration-300 ease-in-out">
              <div className="flex flex-col items-center mb-8">
                <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
                  <Sparkles size={24} className="text-gray-700" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mt-2">BulletAI</h1>
                <p className="text-sm text-gray-500 mt-1">每一个灵魂，都值得被记录</p>
              </div>
              <nav className="flex-1">
                <ul>
                  {navItems.map((item) => (
                    <NavItem 
                      key={item.page} 
                      page={item.page} 
                      icon={item.icon} 
                      label={item.label} 
                      onClick={() => setIsSidebarOpen(false)} // 点击后关闭侧边栏
                    />
                  ))}
                </ul>
              </nav>
            </aside>
          </>
        )}
      </>
    );
  }

  // 桌面端正常显示的侧边栏
  return (
    <aside className="w-64 bg-gradient-to-b from-blue-100/80 via-white/80 to-orange-100/80 border-r border-orange-200 p-4 flex flex-col shrink-0 shadow-lg hidden lg:block">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
          <Sparkles size={24} className="text-gray-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">BulletAI</h1>
        <p className="text-sm text-gray-500 mt-1">每一个灵魂，都值得被记录</p>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <NavItem key={item.page} {...item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};