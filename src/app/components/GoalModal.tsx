// components/GoalModal.tsx
"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook
import { isGuestMode } from '../../lib/guestAuth';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: Date | null;
};

// 将Date对象转换为YYYY-MM-DD格式，避免时区问题
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const GoalModal = ({ isOpen, onClose, onSuccess, selectedDate }: Props) => {
  const { t } = useLanguage(); // 获取翻译函数
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // 获取要使用的日期（使用本地时间格式，避免时区问题）
  // 新建目标时不设置日期，始终添加到迁移列表
  const getDueDate = (): string | null => {
    // 新建目标时始终不设置日期，添加到迁移列表
    // 用户可以通过迁移功能将任务分配到具体日期
    return null;
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim()) return alert(t("pleaseEnterTitle") || "请填写目标标题");

    // 检查是否是游客模式
    if (isGuestMode()) {
      alert(t("guestModeNoSave") || "游客模式不支持保存数据，请先登录");
      return;
    }

    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (userError) {
      console.error("获取用户信息失败:", userError);
      setLoading(false);
      alert(`${t("pleaseLogin") || "请先登录"}: ${userError.message}`);
      return;
    }
    
    if (!user) {
      setLoading(false);
      alert(t("pleaseLogin") || "请先登录");
      return;
    }

    try {
      const dueDate = getDueDate();
      const insertData: {
        user_id: string;
        title: string;
        description: string | null;
        due_date?: string | null;
      } = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
      };
      
      // 只有当dueDate不为null时才设置due_date字段
      if (dueDate !== null) {
        insertData.due_date = dueDate;
      }

      console.log("准备插入的数据:", insertData);
      console.log("用户ID:", user.id);
      console.log("日期格式:", dueDate);

      const { data, error } = await supabase.from("goals").insert([insertData]);

      if (error) {
        // 尝试获取错误的所有属性
        const errorInfo: any = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        };
        
        // 尝试获取所有可枚举属性
        for (const key in error) {
          if (error.hasOwnProperty(key)) {
            errorInfo[key] = (error as any)[key];
          }
        }
        
        console.error("保存失败，错误对象详情:", errorInfo);
        console.error("错误对象类型:", typeof error);
        console.error("错误对象构造函数:", error.constructor?.name);
        console.error("错误对象字符串:", String(error));
        
        // 构建错误消息
        let errorMessage = t("saveFailed") || "保存失败，请重试";
        if (error.message) {
          errorMessage += `: ${error.message}`;
        } else if (error.code) {
          errorMessage += ` (错误代码: ${error.code})`;
        } else if (error.details) {
          errorMessage += ` (详情: ${error.details})`;
        } else {
          errorMessage += ` (未知错误: ${JSON.stringify(errorInfo)})`;
        }
        
        setLoading(false);
        alert(errorMessage);
        return;
      }

      console.log("保存成功，返回数据:", data);
      setLoading(false);
      onSuccess();
      onClose();
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("捕获到异常:", err);
      setLoading(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`${t("saveFailed") || "保存失败，请重试"}: ${errorMsg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl transform transition-transform duration-200">
        <h2 className="text-2xl font-bold mb-4">{t("newGoal") || "新建目标"}</h2>

        <label className="block text-sm text-gray-600 mb-1">
          {t("title") || "标题 *"}
          <span className="text-gray-400 ml-2 text-xs">({title.length}/30)</span>
        </label>
        <Input
          placeholder={t("enterGoal") || "输入目标..."}
          value={title}
          onChange={(e) => {
            if (e.target.value.length <= 30) {
              setTitle(e.target.value);
            }
          }}
          maxLength={30}
        />

        <label className="block text-sm text-gray-600 mt-4 mb-1">
          {t("description") || "描述"}
          <span className="text-gray-400 ml-2 text-xs">({description.length}/70)</span>
        </label>
        <Textarea
          placeholder={t("detailedDescription") || "详细描述..."}
          value={description}
          onChange={(e) => {
            if (e.target.value.length <= 70) {
              setDescription(e.target.value);
            }
          }}
          maxLength={70}
          rows={3}
        />

        <div className="flex justify-end mt-6 space-x-3">
          <Button 
            variant="secondary" 
            onClick={onClose}
            className="min-w-[60px] h-10"
          >
            {t("cancel") || "取消"}
          </Button>
          <Button 
            onClick={handleSubmit} 
            className={`min-w-[60px] h-10 ${loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
          >
            {loading ? t("saving") || "记录中..." : t("save") || "记录"}
          </Button>
        </div>
      </div>
    </div>
  );
};