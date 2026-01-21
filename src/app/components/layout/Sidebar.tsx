// src/components/layout/Sidebar.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Target, Lightbulb, Menu, Home } from 'lucide-react';
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
    router.push(`/main?page=${page}`);
    if (onClick) {
      onClick(); // 调用传入的 onClick 回调
    }
  };

  const liStyle: React.CSSProperties = {
    ...style,
    // 非激活：填充侧边栏主色；激活：使用接近页面大背景的颜色，营造“挖空”效果
    backgroundColor: isActive ? 'var(--color-bg-primary)' : 'var(--color-primary)',
  };

  return (
    <li
      className={`flex items-center justify-center p-3 cursor-pointer rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform ${
        isActive 
          ? 'scale-105 shadow-md' 
          : 'hover:opacity-90 hover:scale-105 active:scale-95'
      } ${className || ''}`}
      onClick={handleClick}
      title={label}
      style={{
        ...liStyle,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.opacity = '0.9';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.opacity = '1';
        }
      }}
    >
      <span 
        className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isActive ? 'scale-110' : ''
        }`}
        style={{
          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--color-text-inverse)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }
        }}
      >
        {icon}
      </span>
    </li>
  );
};

export const Sidebar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLanguage(); // 获取翻译函数
  
  const navItems = [
    { page: 'home', label: 'Home', icon: <Home size={20} /> },
    { page: 'moments', label: t("moments") || '我的时刻', icon: <Camera size={20} /> },
    { page: 'goals', label: t("goals") || '我的目标', icon: <Target size={20} /> },
    { page: 'reflections', label: t("insights") || '我的感悟', icon: <Lightbulb size={20} /> },
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
            className="fixed bottom-4 left-4 z-50 p-3 bg-gradient-to-br from-blue-100/30 via-white/30 to-orange-100/30 backdrop-blur-lg rounded-full shadow-lg border border-gray-200/50 lg:hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 active:scale-95 hover:shadow-xl"
            aria-label={t("toggleMenu") || "切换菜单"}
          >
            <Menu size={24} className="transition-transform duration-300" />
          </button>
        )}

        {/* 移动端侧边栏覆盖层 */}
        {isSidebarOpen && (
          <>
            {/* 遮罩层 */}
            <div 
              className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isSidebarOpen ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={toggleSidebar}
            />
            
            {/* 侧边栏内容 */}
            <aside 
              className={`fixed top-20 left-4 rounded-[32px] p-3 z-50 shadow-lg lg:hidden transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
              }`}
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <nav>
                <ul className="space-y-2">
                  {navItems.map((item, index) => (
                    <NavItem 
                      key={item.page}
                      page={item.page} 
                      icon={item.icon} 
                      label={item.label} 
                      onClick={() => setIsSidebarOpen(false)} // 点击后关闭侧边栏
                      className="animate-fadeInUp"
                      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
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
    <aside 
      className="fixed left-4 top-20 rounded-[32px] p-3 shadow-lg hidden lg:block z-30"
      style={{ backgroundColor: 'var(--color-primary)' }}
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