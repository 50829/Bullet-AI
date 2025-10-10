// src/context/AppContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

// 定义数据类型
type Moment = {
  id: number;
  created_at: string;
  content: string;
  event_type: string;
  location: string;
  image_url?: string | null;
  image_path?: string | null;
  tags?: string[];
  date?: string;
};

type Reflection = {
  id: number;
  created_at: string;
  content: string;
  source?: string | null;
  source_type?: string | null;
  location?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

type Goal = {
  id: number;
  created_at: string;
  title: string;
  description: string;
  status: string;
  due_date?: string | null;
  progress: number;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

// 定义上下文类型
interface AppContextType {
  moments: Moment[];
  reflections: Reflection[];
  goals: Goal[];
  loading: {
    moments: boolean;
    reflections: boolean;
    goals: boolean;
  };
  refreshMoments: () => Promise<void>;
  refreshReflections: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  addMoment: (moment: Moment) => void;
  addReflection: (reflection: Reflection) => void;
  addGoal: (goal: Goal) => void;
  updateMoment: (id: number, updates: Partial<Moment>) => void;
  updateReflection: (id: number, updates: Partial<Reflection>) => void;
  updateGoal: (id: number, updates: Partial<Goal>) => void;
  deleteMoment: (id: number) => void;
  deleteReflection: (id: number) => void;
  deleteGoal: (id: number) => void;
}

// 创建上下文
const AppContext = createContext<AppContextType | undefined>(undefined);

// 创建 Provider 组件
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const [loading, setLoading] = useState({
    moments: true,
    reflections: true,
    goals: true,
  });

  // 格式化日期函数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取 Moments 数据
  const fetchMoments = async () => {
    setLoading(prev => ({ ...prev, moments: true }));
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data?.user;
    if (!user) {
      setLoading(prev => ({ ...prev, moments: false }));
      return;
    }

    const { data, error } = await supabase
      .from("moments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取时刻失败:", error);
      setLoading(prev => ({ ...prev, moments: false }));
      return;
    }

    const withUrls = await Promise.all(
      (data || []).map(async (item: Moment) => {
        let signedUrl: string | null = null;
        if (item.image_path) {
          const result = await supabase.storage
            .from("moments")
            .createSignedUrl(item.image_path, 60 * 60); // 1 小时
          if (!result.error && result.data) signedUrl = result.data.signedUrl ?? null;
        }
        return {
          ...item,
          image_url: signedUrl,
          date: formatDate(item.created_at),
        };
      })
    );

    setMoments(withUrls);
    setLoading(prev => ({ ...prev, moments: false }));
  };

  // 获取 Reflections 数据
  const fetchReflections = async () => {
    setLoading(prev => ({ ...prev, reflections: true }));
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data?.user;
    if (!user) {
      setLoading(prev => ({ ...prev, reflections: false }));
      return;
    }

    const { data, error } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取感悟失败:", error);
      setLoading(prev => ({ ...prev, reflections: false }));
      return;
    }

    const withUrls = await Promise.all(
      (data || []).map(async (item: Reflection) => {
        let signedUrl: string | null = item.image_url ?? null;
        if (!signedUrl && item.image_path) {
          const result = await supabase.storage
            .from("reflections")
            .createSignedUrl(item.image_path, 60 * 60);
          
          if (!result.error && result.data) {
            signedUrl = result.data.signedUrl;
          }
        }
        return {
          ...item,
          image_url: signedUrl,
          date: formatDate(item.created_at),
        };
      })
    );

    setReflections(withUrls);
    setLoading(prev => ({ ...prev, reflections: false }));
  };

  // 获取 Goals 数据
  const fetchGoals = async () => {
    setLoading(prev => ({ ...prev, goals: true }));
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data?.user;
    if (!user) {
      setLoading(prev => ({ ...prev, goals: false }));
      return;
    }

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取目标失败:", error);
      setLoading(prev => ({ ...prev, goals: false }));
      return;
    }

    const withUrls = await Promise.all(
      (data || []).map(async (item: Goal) => {
        let signedUrl: string | null = null;
        if (item.image_path) {
          const result = await supabase.storage
            .from("goals")
            .createSignedUrl(item.image_path, 60 * 60); // 1 小时
          if (!result.error && result.data) signedUrl = result.data.signedUrl ?? null;
        }
        return {
          ...item,
          image_url: signedUrl,
          date: formatDate(item.created_at),
        };
      })
    );

    setGoals(withUrls);
    setLoading(prev => ({ ...prev, goals: false }));
  };

  // 初始化加载所有数据
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        fetchMoments(),
        fetchReflections(),
        fetchGoals()
      ]);
    };
    
    loadAllData();
    
    // 设置定时刷新（可选）
    const interval = setInterval(() => {
      fetchMoments();
      fetchReflections();
      fetchGoals();
    }, 50 * 60 * 1000); // 每 50 分钟刷新一次签名 URL
    
    return () => clearInterval(interval);
  }, []);

  // 刷新函数
  const refreshMoments = async () => {
    await fetchMoments();
  };

  const refreshReflections = async () => {
    await fetchReflections();
  };

  const refreshGoals = async () => {
    await fetchGoals();
  };

  // 更新函数
  const updateMoment = (id: number, updates: Partial<Moment>) => {
    setMoments(prev => prev.map(moment => 
      moment.id === id ? { ...moment, ...updates } : moment
    ));
  };

  const updateReflection = (id: number, updates: Partial<Reflection>) => {
    setReflections(prev => prev.map(reflection => 
      reflection.id === id ? { ...reflection, ...updates } : reflection
    ));
  };

  const updateGoal = (id: number, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    ));
  };

  // 删除函数
  const deleteMoment = (id: number) => {
    setMoments(prev => prev.filter(moment => moment.id !== id));
  };

  const deleteReflection = (id: number) => {
    setReflections(prev => prev.filter(reflection => reflection.id !== id));
  };

  const deleteGoal = (id: number) => {
    setGoals(prev => prev.filter(goal => goal.id !== id));
  };

  // 添加函数
  const addMoment = (moment: Moment) => {
    setMoments(prev => [moment, ...prev]);
  };

  const addReflection = (reflection: Reflection) => {
    setReflections(prev => [reflection, ...prev]);
  };

  const addGoal = (goal: Goal) => {
    setGoals(prev => [goal, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        moments,
        reflections,
        goals,
        loading,
        refreshMoments,
        refreshReflections,
        refreshGoals,
        addMoment,
        addReflection,
        addGoal,
        updateMoment,
        updateReflection,
        updateGoal,
        deleteMoment,
        deleteReflection,
        deleteGoal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// 自定义 Hook
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};