// src/context/AppContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

// 定义数据类型
type Moment = {
  id: number;
  created_at: string;
  content: string;
  image_url?: string | null;
  image_path?: string | null;
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
  updateReflection: (id: number, updates: Partial<Reflection>) => Promise<void>;
  updateGoal: (id: number, updates: Partial<Goal>) => Promise<void>; // 更新为 Promise<void>
  deleteMoment: (id: number, imagePath?: string | null) => Promise<void>;
  deleteReflection: (id: number, imagePath?: string | null) => Promise<void>;
  deleteGoal: (id: number, imagePath?: string | null) => Promise<void>;
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
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // 获取 Moments 数据
  const fetchMoments = useCallback(async () => {
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
  }, [formatDate]);

  // 获取 Reflections 数据
  const fetchReflections = useCallback(async () => {
    setLoading(prev => ({ ...prev, reflections: true }));
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data?.user;
    if (!user) {
      setLoading(prev => ({ ...prev, reflections: false }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reflections")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false }); // 使用 id 排序，因为 created_at 列可能不存在

      // 优先检查数据是否存在 - 如果数据存在，即使有错误也继续处理
      if (data && Array.isArray(data)) {
        // 数据存在，继续处理（即使可能有错误对象）
        if (error) {
          // 记录警告但不阻止处理 - 可能是 Supabase 客户端的误报
          console.warn("获取感悟时检测到错误对象，但数据存在，继续处理。数据数量:", data.length);
        }
        // 继续执行下面的处理逻辑
      } else {
        // 数据不存在，检查是否有错误
        if (error) {
          // 尝试获取错误信息
          const errorMessage = error.message || error.code || error.details || "未知错误";
          console.error("获取感悟失败:", errorMessage);
        } else {
          console.warn("获取感悟返回空数据，用户ID:", user.id);
        }
        setLoading(prev => ({ ...prev, reflections: false }));
        setReflections([]);
        return;
      }

      const withUrls = await Promise.all(
        (data || []).map(async (item: Reflection) => {
          try {
            let signedUrl: string | null = item.image_url ?? null;
            if (!signedUrl && item.image_path) {
              const result = await supabase.storage
                .from("reflections")
                .createSignedUrl(item.image_path, 60 * 60);
              
              if (!result.error && result.data) {
                signedUrl = result.data.signedUrl;
              }
            }
            // 处理 created_at 可能不存在的情况
            const dateString = item.created_at || new Date().toISOString();
            return {
              ...item,
              image_url: signedUrl,
              date: formatDate(dateString),
            };
          } catch (itemError) {
            console.error("处理感悟项失败:", itemError, item);
            // 即使处理单个项失败，也返回基本数据
            const dateString = item.created_at || new Date().toISOString();
            return {
              ...item,
              image_url: item.image_url ?? null,
              date: formatDate(dateString),
            };
          }
        })
      );

      setReflections(withUrls);
      setLoading(prev => ({ ...prev, reflections: false }));
    } catch (err) {
      // 捕获任何未预期的错误
      console.error("获取感悟时发生异常:", err);
      if (err instanceof Error) {
        console.error("错误消息:", err.message);
        console.error("错误堆栈:", err.stack);
      }
      setReflections([]);
      setLoading(prev => ({ ...prev, reflections: false }));
    }
  }, [formatDate]);

  // 获取 Goals 数据
  const fetchGoals = useCallback(async () => {
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
  }, [formatDate]);

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
  }, [fetchGoals, fetchMoments, fetchReflections]);

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

  // 更新函数 - 修改 updateGoal 使其异步并与 Supabase 交互，添加日志
  const updateMoment = (id: number, updates: Partial<Moment>) => {
    setMoments(prev => prev.map(moment => 
      moment.id === id ? { ...moment, ...updates } : moment
    ));
  };

  const updateReflection = async (id: number, updates: Partial<Reflection>) => {
    // 1. 先更新前端状态，提供即时反馈
    setReflections(prev => prev.map(reflection => 
      reflection.id === id ? { ...reflection, ...updates } : reflection
    ));

    // 2. 更新数据库
    try {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data?.user;
      if (!user) {
        throw new Error("用户未登录，无法更新感悟");
      }

      const { error: dbError } = await supabase
        .from("reflections")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (dbError) {
        console.error("更新感悟失败:", dbError);
        // 如果更新失败，刷新数据以恢复状态
        refreshReflections();
        throw new Error(`更新失败: ${dbError.message}`);
      }
    } catch (err) {
      console.error("更新感悟异常:", err);
      // 如果更新失败，刷新数据以恢复状态
      refreshReflections();
      throw err;
    }
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

  // 删除函数 - 实现乐观更新
  const deleteMoment = async (id: number, imagePath?: string | null) => {
    // 1. 先从全局状态中删除（乐观更新）
    setMoments(prev => prev.filter(moment => moment.id !== id));

    try {
      // 2. 如果有图片路径，先删除图片
      if (imagePath) {
        const { error: storageError } = await supabase.storage
          .from("moments")
          .remove([imagePath]);
        if (storageError) console.error("删除图片失败:", storageError);
      }

      // 3. 从数据库删除
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
      // 如果删除失败，将数据恢复到状态中
      refreshMoments(); // 或者重新获取数据
      throw new Error("删除失败");
    }
  };

  const deleteReflection = async (id: number, imagePath?: string | null) => {
    // 1. 先从全局状态中删除（乐观更新）
    setReflections(prev => prev.filter(reflection => reflection.id !== id));

    try {
      // 2. 如果有图片路径，先删除图片
      if (imagePath) {
        const { error: storageError } = await supabase.storage
          .from("reflections")
          .remove([imagePath]);
        if (storageError) console.error("删除图片失败:", storageError);
      }

      // 3. 从数据库删除
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
      // 如果删除失败，将数据恢复到状态中
      refreshReflections(); // 或者重新获取数据
      throw new Error("删除失败");
    }
  };

  const deleteGoal = async (id: number, imagePath?: string | null) => {
    // 1. 先从全局状态中删除（乐观更新）
    setGoals(prev => prev.filter(goal => goal.id !== id));

    try {
      // 2. 如果有图片路径，先删除图片
      if (imagePath) {
        const { error: storageError } = await supabase.storage
          .from("goals")
          .remove([imagePath]);
        if (storageError) console.error("删除图片失败:", storageError);
      }

      // 3. 从数据库删除
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
      // 如果删除失败，将数据恢复到状态中
      refreshGoals(); // 或者重新获取数据
      throw new Error("删除失败");
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
        updateGoal, // 使用修改后的函数
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
