"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const HabitModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("每日");
  const [color, setColor] = useState("蓝色");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return alert("请填写习惯名称");
    setLoading(true);
    const { error } = await supabase.from("habits").insert({
      name,
      description,
      frequency,
      color,
    });
    setLoading(false);
    if (error) {
      console.error(error);
      alert("保存失败，请重试");
    } else {
      onSuccess();
      onClose();
    }
  };

  const colorMap: Record<string, string> = {
    蓝色: "bg-blue-500",
    红色: "bg-red-500",
    绿色: "bg-green-500",
    黄色: "bg-yellow-500",
    紫色: "bg-purple-500",
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold mb-4">新建习惯</h2>

        <label className="block text-sm text-gray-600 mb-1">习惯名称 *</label>
        <Input
          placeholder="例如：晨间阅读、运动打卡..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-sm text-gray-600 mt-4 mb-1">描述</label>
        <Textarea
          placeholder="描述这个习惯..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">目标频率</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-400"
            >
              <option>每日</option>
              <option>每周</option>
              <option>每月</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">标识颜色</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-400"
            >
              <option>蓝色</option>
              <option>红色</option>
              <option>绿色</option>
              <option>黄色</option>
              <option>紫色</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm text-gray-600 mb-2">预览</label>
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-white ${colorMap[color]} transition`}
          >
            {name || "习惯名称"}
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            className={loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
          >
            {loading ? "发布中..." : "发布"}
          </Button>
        </div>
      </div>
    </div>
  );
};
