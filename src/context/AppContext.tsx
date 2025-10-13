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
  type: string; // 添加 type 字段
  priority?: string;
};

type Habit = {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  color: string | null;
  created_at: string;
  last_checkin?: string | null; // 上次打卡时间
  checkin_count?: number; // 打卡次数
  date?: string;
};

// 定义上下文类型
interface AppContextType {
  moments: Moment[];
  reflections: Reflection[];
  goals: Goal[];
  habits: Habit[];
  loading: {
    moments: boolean;
    reflections: boolean;
    goals: boolean;
    habits: boolean;
  };
  refreshMoments: () => Promise<void>;
  refreshReflections: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshHabits: () => Promise<void>;
  addMoment: (moment: Moment) => void;
  addReflection: (reflection: Reflection) => void;
  addGoal: (goal: Goal) => void;
  addHabit: (habit: Habit) => void;
  updateMoment: (id: number, updates: Partial<Moment>) => void;
  updateReflection: (id: number, updates: Partial<Reflection>) => void;
  updateGoal: (id: number, updates: Partial<Goal>) => Promise<void>; // 更新为 Promise<void>
  updateHabit: (id: number, updates: Partial<Habit>) => void;
  deleteMoment: (id: number, imagePath?: string | null) => Promise<void>;
  deleteReflection: (id: number, imagePath?: string | null) => Promise<void>;
  deleteGoal: (id: number, imagePath?: string | null) => Promise<void>;
  deleteHabit: (id: number, imagePath?: string | null) => Promise<void>;
  checkinHabit: (id: number) => Promise<void>;
}

// 创建上下文
const AppContext = createContext<AppContextType | undefined>(undefined);

// 创建 Provider 组件
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  
  const [loading, setLoading] = useState({
    moments: true,
    reflections: true,
    goals: true,
    habits: true,
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

  // 计算距离上次打卡的天数
  const daysSinceLastCheckin = (lastCheckinDate?: string | null): number | null => {
    if (!lastCheckinDate) return null;
    const lastCheckin = new Date(lastCheckinDate);
    const today = new Date();
    const diffTime = today.getTime() - lastCheckin.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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

  // 获取 Habits 数据
  const fetchHabits = async () => {
    setLoading(prev => ({ ...prev, habits: true }));
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data?.user;
    if (!user) {
      setLoading(prev => ({ ...prev, habits: false }));
      return;
    }

    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取习惯失败:", error);
      setLoading(prev => ({ ...prev, habits: false }));
      return;
    }

    const formattedData = (data || []).map((item: Habit) => ({
      ...item,
      date: formatDate(item.created_at),
    }));

    setHabits(formattedData);
    setLoading(prev => ({ ...prev, habits: false }));
  };

  // 初始化加载所有数据
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        fetchMoments(),
        fetchReflections(),
        fetchGoals(),
        fetchHabits()
      ]);
    };
    
    loadAllData();
    
    // 设置定时刷新（可选）
    const interval = setInterval(() => {
      fetchMoments();
      fetchReflections();
      fetchGoals();
      fetchHabits();
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

  const refreshHabits = async () => {
    await fetchHabits();
  };

  // 更新函数 - 修改 updateGoal 使其异步并与 Supabase 交互，添加日志
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

  // 修改 updateGoal 函数 - 添加日志
  const updateGoal = async (id: number, updates: Partial<Goal>) => {
    console.log(`[AppContext DEBUG] 开始更新目标 ${id}，更新内容:`, updates);
    
    // 1. 先更新前端状态，提供即时反馈
    setGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    ));
    console.log(`[AppContext DEBUG] 前端状态已更新，当前 goals 状态:`, goals);

    // 2. 尝试更新 Supabase 数据库
    try {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data?.user;
      if (!user) {
        throw new Error("用户未登录，无法更新目标");
      }

      console.log(`[AppContext DEBUG] 向 Supabase 发送更新请求，目标 ID: ${id}, 更新内容:`, updates);
      const { data: dbData, error: dbError } = await supabase
        .from("goals")
        .update(updates) // 更新指定字段
        .eq("id", id)     // 通过 ID 匹配目标
        .eq("user_id", user.id); // 确保只能更新自己的目标

      if (dbError) {
        console.error("[AppContext ERROR] 更新数据库失败:", dbError);
        throw new Error(`更新数据库失败: ${dbError.message}`);
      }

      console.log(`[AppContext SUCCESS] 目标 ${id} 数据库更新成功，返回数据:`, dbData);
    } catch (err) {
      console.error("[AppContext ERROR] 更新目标失败:", err);
      throw err; // 抛出错误，让调用者 (handleMoveGoal) 能够捕获
    }
  };

  const updateHabit = (id: number, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(habit => 
      habit.id === id ? { ...habit, ...updates } : habit
    ));
  };

  // 删除函数
  const deleteMoment = async (id: number, imagePath?: string | null) => {
    // 如果有图片路径，先删除图片
    if (imagePath) {
      try {
        const { error: storageError } = await supabase.storage
          .from("moments")
          .remove([imagePath]);
        if (storageError) console.error("删除图片失败:", storageError);
      } catch (err) {
        console.error("删除图片异常:", err);
      }
    }

    // 从数据库删除
    try {
      const { error: dbError } = await supabase
        .from("moments")
        .delete()
        .eq("id", id);

      if (dbError) {
        console.error("删除时刻失败:", dbError);
        throw new Error("删除时刻失败");
      }
    } catch (err) {
      console.error("删除异常:", err);
      throw new Error("删除失败");
    }

    // 从全局状态中删除
    setMoments(prev => prev.filter(moment => moment.id !== id));
  };

  const deleteReflection = async (id: number, imagePath?: string | null) => {
    // 如果有图片路径，先删除图片
    if (imagePath) {
      try {
        const { error: storageError } = await supabase.storage
          .from("reflections")
          .remove([imagePath]);
        if (storageError) console.error("删除图片失败:", storageError);
      } catch (err) {
        console.error("删除图片异常:", err);
      }
    }

    // 从数据库删除
    try {
      const { error: dbError } = await supabase
        .from("reflections")
        .delete()
        .eq("id", id);

      if (dbError) {
        console.error("删除感悟失败:", dbError);
        throw new Error("删除感悟失败");
      }
    } catch (err) {
      console.error("删除异常:", err);
      throw new Error("删除失败");
    }

    // 从全局状态中删除
    setReflections(prev => prev.filter(reflection => reflection.id !== id));
  };

  const deleteGoal = async (id: number, imagePath?: string | null) => {
    // 如果有图片路径，先删除图片
    if (imagePath) {
      try {
        const { error: storageError } = await supabase.storage
          .from("goals")
          .remove([imagePath]);
        if (storageError) console.error("删除图片失败:", storageError);
      } catch (err) {
        console.error("删除图片异常:", err);
      }
    }

    // 从数据库删除
    try {
      const { error: dbError } = await supabase
        .from("goals")
        .delete()
        .eq("id", id);

      if (dbError) {
        console.error("删除目标失败:", dbError);
        throw new Error("删除目标失败");
      }
    } catch (err) {
      console.error("删除异常:", err);
      throw new Error("删除失败");
    }

    // 从全局状态中删除
    setGoals(prev => prev.filter(goal => goal.id !== id));
  };

  const deleteHabit = async (id: number, imagePath?: string | null) => {
    // 如果有图片路径，先删除图片
    if (imagePath) {
      try {
        const { error: storageError } = await supabase.storage
          .from("habits")
          .remove([imagePath]);
        if (storageError) console.error("删除图片失败:", storageError);
      } catch (err) {
        console.error("删除图片异常:", err);
      }
    }

    // 从数据库删除
    try {
      const { error: dbError } = await supabase
        .from("habits")
        .delete()
        .eq("id", id);

      if (dbError) {
        console.error("删除习惯失败:", dbError);
        throw new Error("删除习惯失败");
      }
    } catch (err) {
      console.error("删除异常:", err);
      throw new Error("删除失败");
    }

    // 从全局状态中删除
    setHabits(prev => prev.filter(habit => habit.id !== id));
  };

  // 打卡功能
  const checkinHabit = async (id: number) => {
    try {
      // 检查是否今天已经打卡
      const habit = habits.find(h => h.id === id);
      if (habit && habit.last_checkin) {
        const lastCheckinDate = new Date(habit.last_checkin);
        const today = new Date();
        if (
          lastCheckinDate.getDate() === today.getDate() &&
          lastCheckinDate.getMonth() === today.getMonth() &&
          lastCheckinDate.getFullYear() === today.getFullYear()
        ) {
          throw new Error("今天已经打卡过了");
        }
      }

      // 获取当前打卡次数
      const currentHabit = habits.find(h => h.id === id);
      const currentCount = currentHabit?.checkin_count || 0;
      
      // 更新数据库
      const { error: dbError } = await supabase
        .from("habits")
        .update({
          last_checkin: new Date().toISOString(),
          checkin_count: currentCount + 1
        })
        .eq("id", id);

      if (dbError) {
        console.error("打卡失败:", dbError);
        throw new Error(`打卡失败: ${dbError.message}`);
      }

      // 更新全局状态
      setHabits(prev => prev.map(habit => 
        habit.id === id 
          ? { 
              ...habit, 
              last_checkin: new Date().toISOString(),
              checkin_count: currentCount + 1
            } 
          : habit
      ));
    } catch (err) {
      console.error("打卡异常:", err);
      throw new Error(err instanceof Error ? err.message : "打卡失败");
    }
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

  const addHabit = (habit: Habit) => {
    setHabits(prev => [habit, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        moments,
        reflections,
        goals,
        habits,
        loading,
        refreshMoments,
        refreshReflections,
        refreshGoals,
        refreshHabits,
        addMoment,
        addReflection,
        addGoal,
        addHabit,
        updateMoment,
        updateReflection,
        updateGoal, // 使用修改后的函数
        updateHabit,
        deleteMoment,
        deleteReflection,
        deleteGoal,
        deleteHabit,
        checkinHabit,
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