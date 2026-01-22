"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 主题初始化组件
 * 在应用启动时加载保存的主题，并监听主题变化
 * 登录页和注册页始终使用经典配色
 */
export function ThemeInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    // 检查当前路径是否为登录页或注册页
    const isAuthPage = pathname === '/login' || pathname === '/register';
    
    // 立即应用主题，避免闪烁
    const applyTheme = (theme: string | null) => {
      const root = document.documentElement;
      // 清除所有主题类
      root.className = root.className.split(' ').filter(cls => !cls.startsWith('theme-')).join(' ').trim();
      
      // 如果是登录页或注册页，强制使用默认主题
      if (isAuthPage) {
        return; // 不应用任何主题类，使用默认主题
      }
      
      if (theme && theme !== 'default') {
        root.className = root.className ? `${root.className} theme-${theme}` : `theme-${theme}`;
      }
    };

    // 加载保存的主题
    const savedTheme = localStorage.getItem('app-theme');
    applyTheme(savedTheme);

    // 监听自定义事件，用于同标签页内的主题切换
    const handleThemeChange = (e: CustomEvent<string>) => {
      // 如果是登录页或注册页，忽略主题切换
      if (isAuthPage) {
        const root = document.documentElement;
        root.className = root.className.split(' ').filter(cls => !cls.startsWith('theme-')).join(' ').trim();
        return;
      }
      applyTheme(e.detail);
    };

    // 监听 storage 事件，以便在多个标签页之间同步主题
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-theme') {
        // 如果是登录页或注册页，忽略主题变化
        if (isAuthPage) {
          const root = document.documentElement;
          root.className = root.className.split(' ').filter(cls => !cls.startsWith('theme-')).join(' ').trim();
          return;
        }
        applyTheme(e.newValue);
      }
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);

  return null;
}
