// components/HabitModal.tsx
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

export const HabitModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { t } = useLanguage(); // 获取翻译函数
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return alert(t("pleaseEnterHabitName") || "请填写习惯名称");

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert(t("pleaseLogin") || "请先登录");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name,
      description,
      frequency: t("daily") || "每日",
      color: "蓝色",
    });

    setLoading(false);
    if (error) {
      console.error(error);
      alert(t("saveFailed") || "保存失败，请重试");
    } else {
      onSuccess();
      onClose();
      setName("");
      setDescription("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="rounded-[28px] p-6 w-full max-w-md shadow-xl transform transition-transform duration-200" style={{ backgroundColor: 'var(--color-modal-card, #efeeeb)' }}>
        <h2 className="text-2xl font-bold mb-4">{t("newHabit") || "新建习惯"}</h2>

        <label className="block text-sm text-gray-600 mb-1">{t("habitName") || "习惯名称 *"}</label>
        <Input
          placeholder={t("habitPlaceholder") || "例如：晨间阅读、运动打卡..."}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-sm text-gray-600 mt-4 mb-1">{t("description") || "描述"}</label>
        <Textarea
          placeholder={t("describeHabit") || "描述这个习惯..."}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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