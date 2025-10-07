"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Input } from "./ui/Input";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const MomentModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [content, setContent] = useState("");
  const [eventType, setEventType] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!imageFile) return null;
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage
      .from("moments")
      .upload(fileName, imageFile);

    if (error) {
      console.error("图片上传失败:", error);
      return null;
    }
    const { data: publicUrl } = supabase.storage
      .from("moments")
      .getPublicUrl(fileName);
    return publicUrl.publicUrl;
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);

    const imageUrl = await handleUpload();

    const { error } = await supabase.from("moments").insert({
      content,
      event_type: eventType,
      location,
      image_url: imageUrl,
      tags: ["生活"],
    });

    setLoading(false);
    if (error) {
      console.error("保存失败:", error);
      alert("发布失败，请重试");
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl">
        <h2 className="text-2xl font-bold mb-4">记录新时刻</h2>

        <label className="block text-sm text-gray-600 mb-1">内容</label>
        <Textarea
          placeholder="记录这一刻的感受..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">事件类型</label>
            <Input
              placeholder="例如：生活、工作、学习..."
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">地点</label>
            <Input
              placeholder="记录地点..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">
            上传图片
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="block w-full border border-dashed border-purple-300 rounded-lg p-3 text-sm text-gray-500 hover:bg-purple-50 cursor-pointer"
          />
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