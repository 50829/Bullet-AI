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

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error("获取用户信息错误:", userErr);
    }
    const user = userData?.user;
    if (!user) {
      alert("请先登录");
      return null;
    }

    const timestamp = Date.now();
    const ext = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}.${ext}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("moments")
      .upload(filePath, imageFile, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("图片上传失败:", uploadError);
      alert("图片上传失败，请重试");
      return null;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("moments")
      .createSignedUrl(filePath, 60 * 60 * 24);

    if (signedError || !signedData) {
      console.error("生成签名URL失败:", signedError);
      return { publicUrl: null, path: filePath };
    }

    return { publicUrl: signedData.signedUrl as string, path: filePath };
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert("内容不能为空");
      return;
    }
    setLoading(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        console.error("getUser 错误:", userErr);
      }
      const user = userData?.user;
      if (!user) {
        alert("请先登录");
        setLoading(false);
        return;
      }

      let imageUrl: string | null = null;
      let imagePath: string | null = null;
      if (imageFile) {
        const uploaded = await handleUpload();
        imageUrl = uploaded?.publicUrl ?? null;
        imagePath = uploaded?.path ?? null;
      }

      // 移除默认的 "生活" 标签
      const payload = {
        user_id: user.id,
        content,
        event_type: eventType,
        location,
        image_url: imageUrl,
        image_path: imagePath,
        tags: [], // 改为空数组
      };

      console.log("插入 payload:", payload);

      const { data, error } = await supabase.from("moments").insert([payload]);

      console.log("insert 返回:", { data, error });

      if (error) {
        console.error("保存失败（详细）:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        alert("发布失败，请重试");
      } else {
        onSuccess();
        onClose();
        setContent("");
        setEventType("");
        setLocation("");
        setImageFile(null);
      }
    } catch (err) {
      console.error("提交错误:", err);
      alert("发布失败，请重试");
    } finally {
      setLoading(false);
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