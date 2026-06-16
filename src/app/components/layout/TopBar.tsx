"use client";
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Camera, Target, Lightbulb } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserProfile } from '../../../lib/profile/profileService';

// TopBar Context
type TopBarHandlers = {
  onAddMoment?: () => void;
  onAddGoal?: () => void;
  onAddReflection?: () => void;
  onToggleAIPanel?: () => void;
  onToggleSearch?: () => void;
  showAIPanel?: boolean;
  showSearch?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: () => void;
  onClearSearch?: () => void;
};

type TopBarContextType = TopBarHandlers & {
  setTopBarHandlers: (handlers: TopBarHandlers) => void;
};

const TopBarContext = createContext<TopBarContextType | null>(null);

export const useTopBar = () => {
  const context = useContext(TopBarContext);
  if (!context) {
    throw new Error('useTopBar must be used within TopBarProvider');
  }
  return context;
};

export const TopBarProvider = ({ children }: { children: React.ReactNode }) => {
  const [handlers, setHandlers] = useState<TopBarHandlers>({});

  const setTopBarHandlers = useCallback((newHandlers: TopBarHandlers) => {
    setHandlers(prev => {
      // 检查是否有实际变化，避免不必要的更新
      const hasChanges = Object.keys(newHandlers).some(key => {
        const typedKey = key as keyof TopBarHandlers;
        return prev[typedKey] !== newHandlers[typedKey];
      });
      return hasChanges ? { ...prev, ...newHandlers } : prev;
    });
  }, []);

  const value: TopBarContextType = useMemo(() => ({
    ...handlers,
    setTopBarHandlers,
  }), [handlers, setTopBarHandlers]);

  return (
    <TopBarContext.Provider value={value}>
      {children}
    </TopBarContext.Provider>
  );
};

export const TopBar = () => {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const currentPage = searchParams.get('page') || 'home';
  const context = useContext(TopBarContext);
  const [username, setUsername] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // 获取用户名
  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const profile = await getCurrentUserProfile();
        setUsername(profile?.username || null);
      } catch (error) {
        console.error("获取用户名失败:", error);
        setUsername(null);
      }
    };

    fetchUsername();

    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ username?: string | null }>).detail;
      setUsername(detail?.username || null);
    };

    window.addEventListener('profile-updated', handleProfileUpdated);

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const profile = await getCurrentUserProfile();
        setUsername(profile?.username || null);
      } else {
        setUsername(null);
      }
    });

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated);
      subscription.unsubscribe();
    };
  }, []);

  if (!context) {
    // 如果没有 context，返回基本布局（透明背景，显示全局渐变）
    return (
      <div className="fixed top-0 left-0 right-0 z-30 bg-transparent">
        <div className="w-full flex items-center justify-between gap-4 pl-4 pr-4 py-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Sparkles className="h-8 w-8" style={{ color: 'var(--color-text-secondary)' }} />
            <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>BulletAI</span>
            {currentPage === 'home' && username && (
              <>
                <span className="mx-1" style={{ color: 'var(--color-text-secondary)' }}>|</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>你好，{username}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const {
    onAddMoment,
    onAddGoal,
    onAddReflection,
    onToggleAIPanel,
  } = context;

  // 根据页面获取标题和图标
  const getPageInfo = () => {
    switch (currentPage) {
      case 'moments':
        return {
          icon: <Camera size={24} className="text-gray-700" />,
          title: t("moments") || "记录",
          aiButtonText: t("aiMomentAssistant") || "AI时刻助手",
          addButtonText: t("addNewMoment") || '+ 记录新时刻',
          onAdd: onAddMoment,
        };
      case 'goals':
        return {
          icon: <Target size={24} className="text-gray-700" />,
          title: t("goals") || "目标",
          aiButtonText: t("aiPlanning") || "AI智能规划",
          addButtonText: `+ ${t("new")} ${t("goal")}`,
          onAdd: onAddGoal,
        };
      case 'reflections':
        return {
          icon: <Lightbulb size={24} className="text-gray-700" />,
          title: t("insights") || "感悟",
          aiButtonText: t("aiThoughtAssistant") || "AI思维助手",
          addButtonText: t("addNewReflection") || '+ 记录新感悟',
          onAdd: onAddReflection,
        };
      default:
        return {
          icon: null,
          title: 'BulletAI',
          aiButtonText: '',
          addButtonText: '',
          onAdd: undefined,
        };
    }
  };

  const pageInfo = getPageInfo();
  const showButtons = currentPage !== 'home';

  return (
    // 顶部栏使用透明背景，让 body 的渐变透出来
    <div className="fixed top-0 left-0 right-0 z-30 h-16 bg-transparent">
      <div className="w-full flex items-center justify-between gap-4 h-full pl-4 pr-4">
        {/* 左侧：Logo 和页面名称 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Sparkles className="h-8 w-8" style={{ color: 'var(--color-text-secondary)' }} />
          <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>BulletAI</span>
          {currentPage === 'home' && username ? (
            <>
              <span className="mx-1" style={{ color: 'var(--color-text-secondary)' }}>|</span>
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>你好，{username}</span>
            </>
          ) : (
            pageInfo.icon && (
              <>
                <span className="mx-1" style={{ color: 'var(--color-text-secondary)' }}>|</span>
                {pageInfo.icon}
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{pageInfo.title}</h2>
              </>
            )
          )}
        </div>

        {/* 右侧：按钮区域 */}
        {showButtons && (
          <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? 'ml-auto' : ''}`}>
            {/* AI助手按钮 */}
            {pageInfo.aiButtonText && onToggleAIPanel && (
              <Button 
                variant="outline" 
                onClick={onToggleAIPanel}
                className={`flex items-center justify-center ${isMobile ? 'gap-0 px-2 min-w-[40px]' : 'gap-1'}`}
                title={isMobile ? pageInfo.aiButtonText : undefined}
              >
                <Sparkles size={16} /> 
                {!isMobile && <span>{pageInfo.aiButtonText}</span>}
              </Button>
            )}
            
            {/* 添加按钮 - 在移动端确保位于右上角 */}
            {pageInfo.onAdd && (
              <Button onClick={pageInfo.onAdd} className={isMobile ? 'px-3 text-sm' : ''}>
                {isMobile ? '+' : pageInfo.addButtonText}
              </Button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
