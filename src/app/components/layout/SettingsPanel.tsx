// src/components/layout/SettingsPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X, User, Palette } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../../lib/supabaseClient';

interface SettingsPanelProps {
  onClose: () => void;
  initialProfile?: {
    username: string;
    updated_at: string | null;
  } | null;
  onProfileUpdate?: (profile: { username: string; updated_at: string | null }) => void;
}

type SettingsSection = 'user' | 'theme';

type ThemeName = 'default' | 'sky';

interface ThemeOption {
  id: ThemeName;
  name: string;
  bgColor: string;
  primaryColor: string;
  bgGradient?: string; // 可选的渐变背景
}

// 将十六进制颜色转换为带透明度的 rgba
const hexToRgba = (hex: string, alpha: number = 1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, initialProfile, onProfileUpdate }) => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SettingsSection>('user');
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');

  // 主题选项配置
  const themes: ThemeOption[] = [
    { id: 'default', name: '经典', bgColor: '#efeeeb', primaryColor: '#003049' },
    { 
      id: 'sky', 
      name: '天空', 
      bgColor: '#8ca4dc', 
      primaryColor: '#13100d', 
      // 左上 8ca4dc → 中间 cad8e5 → 右下 6899fa 的三段渐变
      bgGradient: 'linear-gradient(135deg, #8ca4dc 0%, #cad8e5 45%, #6899fa 100%)' 
    },
  ];

  // 加载保存的主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as ThemeName;
    if (savedTheme && themes.find(t => t.id === savedTheme)) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // 应用主题
  const applyTheme = (theme: ThemeName) => {
    const root = document.documentElement;
    
    // 先清除所有主题类
    const currentClasses = root.className.split(' ').filter(cls => !cls.startsWith('theme-'));
    root.className = currentClasses.join(' ').trim();
    
    // 添加新主题类
    if (theme !== 'default') {
      root.className = root.className ? `${root.className} theme-${theme}` : `theme-${theme}`;
    }
    
    // 强制浏览器重新计算样式
    // 通过读取计算样式来触发重排
    void root.offsetHeight;
  };

  // 切换主题
  const handleThemeChange = (theme: ThemeName) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem('app-theme', theme);
    
    // 触发自定义事件，让 ThemeInitializer 立即更新
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    
    // 触发 storage 事件，以便在多个标签页之间同步
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'app-theme',
      newValue: theme,
      storageArea: localStorage,
    }));
  };

  useEffect(() => {
    // 如果有初始数据，直接使用；否则获取数据
    if (initialProfile) {
      setCurrentUsername(initialProfile.username || '');
      setUsername(initialProfile.username || '');
      
      // 检查是否可以修改用户名（每三天一次）
      if (initialProfile.updated_at) {
        const lastUpdate = new Date(initialProfile.updated_at);
        const now = new Date();
        const diffTime = now.getTime() - lastUpdate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 3) {
          setCanChangeUsername(false);
          const remaining = 3 - diffDays;
          setDaysRemaining(remaining);
        } else {
          setCanChangeUsername(true);
          setDaysRemaining(0);
        }
      } else {
        setCanChangeUsername(true);
        setDaysRemaining(0);
      }
    } else {
      // 如果没有初始数据，尝试获取
      fetchUserProfile();
    }
  }, [initialProfile]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onClose();
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, updated_at")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("获取用户信息失败:", error);
        return;
      }

      if (profile) {
        setCurrentUsername(profile.username || '');
        setUsername(profile.username || '');
        
        // 检查是否可以修改用户名（每三天一次）
        if (profile.updated_at) {
          const lastUpdate = new Date(profile.updated_at);
          const now = new Date();
          const diffTime = now.getTime() - lastUpdate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 3) {
            setCanChangeUsername(false);
            const remaining = 3 - diffDays;
            setDaysRemaining(remaining);
          } else {
            setCanChangeUsername(true);
            setDaysRemaining(0);
          }
        } else {
          setCanChangeUsername(true);
          setDaysRemaining(0);
        }
      }
    } catch (error) {
      console.error("获取用户信息时出错:", error);
    }
  };

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setMessage(t("usernameRequired") || "请输入用户名");
      return;
    }

    if (username.trim() === currentUsername) {
      setMessage(t("usernameUnchanged") || "用户名未更改");
      return;
    }

    if (!canChangeUsername) {
      const cooldownMsg = (t("usernameChangeCooldown") || "您需要等待 {days} 天才能再次修改用户名").replace("{days}", daysRemaining.toString());
      setMessage(cooldownMsg);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onClose();
        return;
      }

      // 检查昵称是否已被使用
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username.trim())
        .single();

      if (existing && existing.user_id !== session.user.id) {
        setMessage(t("usernameTaken") || "该用户名已被使用，请选择其他用户名");
        setLoading(false);
        return;
      }

      // 更新用户名
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (error) {
        console.error("更新用户名失败:", error);
        setMessage(t("updateFailed") || "更新失败，请稍后再试");
        setLoading(false);
        return;
      }

      setCurrentUsername(username.trim());
      setMessage(t("updateSuccess") || "用户名更新成功！");
      setCanChangeUsername(false);
      setDaysRemaining(3);
      
      // 通知父组件更新数据
      if (onProfileUpdate) {
        onProfileUpdate({
          username: username.trim(),
          updated_at: new Date().toISOString(),
        });
      }
      
      // 刷新页面以更新显示的用户名
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("更新用户名时出错:", err);
      setMessage(t("updateError") || "发生错误，请稍后再试");
      setLoading(false);
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        onClick={onClose}
      />
      
      {/* 设置面板 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="rounded-[32px] shadow-xl max-w-4xl w-full h-[80vh] transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col"
          style={{ backgroundColor: 'var(--color-bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t("settings") || "设置"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200/50 transition-colors"
              aria-label={t("close") || "关闭"}
            >
              <X size={24} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* 左侧栏 */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200/50 p-4">
              <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2">
                <button
                  onClick={() => setActiveSection('user')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    activeSection === 'user'
                      ? 'text-white'
                      : 'hover:bg-gray-200/50'
                  }`}
                  style={{
                    backgroundColor: activeSection === 'user' ? 'var(--color-primary)' : 'transparent',
                    color: activeSection === 'user' ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  <User size={20} />
                  <span className="font-medium">{t("user") || "用户"}</span>
                </button>
                <button
                  onClick={() => setActiveSection('theme')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    activeSection === 'theme'
                      ? 'text-white'
                      : 'hover:bg-gray-200/50'
                  }`}
                  style={{
                    backgroundColor: activeSection === 'theme' ? 'var(--color-primary)' : 'transparent',
                    color: activeSection === 'theme' ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  <Palette size={20} />
                  <span className="font-medium">{t("theme") || "主题"}</span>
                </button>
              </nav>
            </div>

            {/* 右侧内容 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {activeSection === 'user' && (
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                    {t("userSettings") || "用户设置"}
                  </h3>

                  <form onSubmit={handleUsernameChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("username") || "用户名"}
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border rounded-3xl px-4 py-2 focus:outline-none focus:ring-2 transition-all duration-300"
                        style={{
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                          '--tw-ring-color': 'var(--color-primary)',
                        } as React.CSSProperties & { '--tw-ring-color': string }}
                        placeholder={t("usernamePlaceholder") || "请输入用户名"}
                        disabled={loading || !canChangeUsername}
                        maxLength={20}
                      />
                      {!canChangeUsername && (
                        <p className="mt-2 text-sm" style={{ color: 'var(--color-accent)' }}>
                          {(t("usernameChangeCooldown") || "您需要等待 {days} 天才能再次修改用户名").replace("{days}", daysRemaining.toString())}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !canChangeUsername || username.trim() === currentUsername}
                      className="px-6 py-2.5 rounded-3xl font-bold border-2 border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-text-on-primary)',
                        borderColor: 'var(--color-primary)',
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)';
                          e.currentTarget.style.color = 'var(--color-text-primary)';
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                          e.currentTarget.style.color = 'var(--color-text-on-primary)';
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }
                      }}
                    >
                      {loading ? (t("saving") || "保存中...") : (t("save") || "保存")}
                    </button>
                  </form>

                  {message && (
                    <p className={`mt-4 text-sm ${
                      message.includes(t("updateSuccess") || "成功") 
                        ? "text-green-500" 
                        : ""
                    }`}
                    style={!message.includes(t("updateSuccess") || "成功") ? { color: 'var(--color-accent)' } : undefined}
                    >
                      {message}
                    </p>
                  )}
                </div>
              )}

              {activeSection === 'theme' && (
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                    {t("themeSettings") || "主题设置"}
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4 max-w-md">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                          currentTheme === theme.id
                            ? 'scale-105 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 hover:scale-102'
                        }`}
                        style={{
                          aspectRatio: '1',
                          borderColor: currentTheme === theme.id ? theme.primaryColor : undefined,
                          boxShadow: currentTheme === theme.id 
                            ? `0 0 0 2px ${hexToRgba(theme.primaryColor, 0.25)}, 0 4px 6px rgba(0, 0, 0, 0.1)` 
                            : undefined,
                        } as React.CSSProperties}
                      >
                        {/* 颜色预览卡片 */}
                        <div className="absolute inset-0 flex">
                          {/* 左侧：背景色（支持渐变） */}
                          <div
                            className="flex-1"
                            style={theme.bgGradient 
                              ? { background: theme.bgGradient }
                              : { backgroundColor: theme.bgColor }
                            }
                          />
                          {/* 右侧：主色 */}
                          <div
                            className="flex-1"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                        </div>
                        
                        {/* 主题名称 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm py-2 px-3">
                          <span
                            className="text-sm font-medium"
                            style={{ color: theme.primaryColor }}
                          >
                            {theme.name}
                          </span>
                        </div>

                        {/* 选中指示器 */}
                        {currentTheme === theme.id && (
                          <div
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
