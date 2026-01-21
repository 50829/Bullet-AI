"use client";

import { useEffect } from 'react';

/**
 * 主题初始化组件
 * 在应用启动时加载保存的主题，并监听主题变化
 */
export function ThemeInitializer() {
  useEffect(() => {
    // 立即应用主题，避免闪烁
    const applyTheme = (theme: string | null) => {
      const root = document.documentElement;
      // 清除所有主题类
      root.className = root.className.split(' ').filter(cls => !cls.startsWith('theme-')).join(' ').trim();
      
      if (theme && theme !== 'default') {
        root.className = root.className ? `${root.className} theme-${theme}` : `theme-${theme}`;
      }
    };

    // 加载保存的主题
    const savedTheme = localStorage.getItem('app-theme');
    applyTheme(savedTheme);

    // 监听自定义事件，用于同标签页内的主题切换
    const handleThemeChange = (e: CustomEvent<string>) => {
      applyTheme(e.detail);
    };

    // 监听 storage 事件，以便在多个标签页之间同步主题
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-theme') {
        applyTheme(e.newValue);
      }
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
}
