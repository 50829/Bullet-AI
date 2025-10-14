// components/GoalModal.tsx
"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const GoalModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { t } = useLanguage(); // 获取翻译函数
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("今日待办"); // 使用原始中文值
  const [priority, setPriority] = useState("中");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim()) return alert(t("pleaseEnterTitle") || "请填写目标标题");

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert(t("pleaseLogin") || "请先登录");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      title,
      description,
      type,
      priority,
    });

    setLoading(false);
    if (error) {
      console.error(error);
      alert(t("saveFailed") || "保存失败，请重试");
    } else {
      onSuccess();
      onClose();
      setTitle("");
      setDescription("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl transform transition-transform duration-200">
        <h2 className="text-2xl font-bold mb-4">{t("newGoal") || "新建目标"}</h2>

        <label className="block text-sm text-gray-600 mb-1">{t("title") || "标题 *"}</label>
        <Input
          placeholder={t("enterGoal") || "输入目标..."}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block text-sm text-gray-600 mt-4 mb-1">{t("description") || "描述"}</label>
        <Textarea
          placeholder={t("detailedDescription") || "详细描述..."}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t("type") || "类型"}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            >
              <option value="今日待办">{t("todayTasks") || "今日待办"}</option>
              <option value="近期目标">{t("recentGoals") || "近期目标"}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">{t("priority") || "优先级"}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            >
              <option value="高">{t("high") || "高"}</option>
              <option value="中">{t("medium") || "中"}</option>
              <option value="低">{t("low") || "低"}</option>
            </select>
          </div>
        </div>

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