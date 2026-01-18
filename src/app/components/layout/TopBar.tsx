"use client";
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Camera, Target, Lightbulb, Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
  
  if (!context) {
    // 如果没有 context，返回基本布局
    return (
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#efeeeb] border-b border-gray-200/50">
        <div className="w-full flex items-center justify-between gap-4 pl-4 pr-4 py-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Sparkles className="h-8 w-8 text-gray-700" />
            <span className="text-2xl font-bold text-gray-800">BulletAI</span>
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
    onToggleSearch,
    showAIPanel = false,
    showSearch = false,
    searchTerm = '',
    onSearchChange,
    onSearch,
    onClearSearch,
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

  const topBarHeight = showSearch && (currentPage === 'moments' || currentPage === 'reflections') ? 'h-24' : 'h-16';
  
  return (
    <div className={`fixed top-0 left-0 right-0 z-30 bg-[#efeeeb] border-b border-gray-200/50 ${topBarHeight}`}>
      <div className="w-full flex items-center justify-between gap-4 h-full pl-4 pr-4">
        {/* 左侧：Logo 和页面名称 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Sparkles className="h-8 w-8 text-gray-700" />
          <span className="text-2xl font-bold text-gray-800">BulletAI</span>
          {pageInfo.icon && (
            <>
              <span className="text-gray-400 mx-1">|</span>
              {pageInfo.icon}
              <h2 className="text-2xl font-bold text-gray-800">{pageInfo.title}</h2>
            </>
          )}
        </div>

        {/* 右侧：按钮区域 */}
        {showButtons && (
          <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
            {/* AI助手按钮 */}
            {pageInfo.aiButtonText && onToggleAIPanel && (
              <Button 
                variant="outline" 
                onClick={onToggleAIPanel}
                className="flex items-center gap-1"
              >
                <Sparkles size={16} /> 
                {pageInfo.aiButtonText}
              </Button>
            )}
            
            {/* 搜索按钮（仅moments和reflections） */}
            {(currentPage === 'moments' || currentPage === 'reflections') && onToggleSearch && (
              <Button 
                variant="outline" 
                onClick={onToggleSearch}
                className="flex items-center gap-1"
              >
                <Search size={16} /> 
                {showSearch ? t("collapseSearch") || '折叠搜索栏' : t("search") || '搜索'}
              </Button>
            )}
            
            {/* 添加按钮 */}
            {pageInfo.onAdd && (
              <Button onClick={pageInfo.onAdd}>
                {pageInfo.addButtonText}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 搜索栏 - 条件渲染 */}
      {showSearch && (currentPage === 'moments' || currentPage === 'reflections') && (
        <div className="border-t border-gray-200/50 pl-4 pr-4 py-3 mt-2">
          <div className="flex gap-2 items-center">
            <Input 
              placeholder={t("searchPlaceholder") || "输入搜索内容~"} 
              value={searchTerm} 
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch?.();
                }
              }}
              className="flex-1 h-10"
            />
            <Button 
              onClick={onSearch} 
              className="flex items-center justify-center h-10 px-4"
            >
              <Search size={16} className="mr-1" /> {t("search") || "搜索"}
            </Button>
            <Button 
              variant="secondary" 
              onClick={onClearSearch} 
              className="h-10 px-4"
              disabled={!searchTerm}
            >
              {t("clear") || "清空"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
