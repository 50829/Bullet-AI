"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";

type Props = { isOpen: boolean; onClose: () => void; onSuccess: () => void; };

export const ReflectionModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!imageFile) return null;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { alert("请先登录再上传图片"); return null; }

    const ext = (imageFile.name.split(".").pop() || "jpg").replace(/\?.*$/,'');
    const safeFileName = `${Date.now()}.${ext}`;
    const filePath = `${user.id}/${safeFileName}`;

    const { error: uploadError } = await supabase.storage.from("reflections").upload(filePath, imageFile, { upsert: false });
    if (uploadError) { console.error("图片上传失败:", uploadError); alert("图片上传失败"); return null; }

    const { data: signedData, error: signedError } = await supabase.storage.from("reflections").createSignedUrl(filePath, 60 * 60);
    if (!signedError && signedData) setPreviewUrl(signedData.signedUrl as string);

    return { path: filePath };
  };

  const handleSubmit = async () => {
    if (!content.trim()) { alert("请填写感悟内容"); return; }
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { alert("请先登录！"); setLoading(false); return; }

      let imagePath: string | null = null;
      if (imageFile) {
        const uploaded = await handleUpload();
        imagePath = uploaded?.path ?? null;
      }

      const { error } = await supabase.from("reflections").insert({
        user_id: user.id,
        content,
        source,
        source_type: sourceType,
        location,
        image_path: imagePath,
      });

      setLoading(false);
      if (error) { console.error("写入 reflections 失败:", error); alert("发布失败，请重试"); }
      else { onSuccess(); onClose(); setContent(""); setSource(""); setSourceType(""); setLocation(""); setImageFile(null); setPreviewUrl(null); }
    } catch (err) {
      console.error("提交错误:", err);
      alert("发布异常，请稍后重试");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-xl">
        <h2 className="text-2xl font-bold mb-4">记录新感悟</h2>

        <label className="block text-sm text-gray-600 mb-1">内容 *</label>
        <Textarea placeholder="记录你的思考和感悟..." value={content} onChange={(e) => setContent(e.target.value)} />

        <label className="block text-sm text-gray-600 mt-4 mb-1">灵感来源</label>
        <Input placeholder="是什么触发了这个想法？" value={source} onChange={(e) => setSource(e.target.value)} />

        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">上传图片/视频</label>
          <input type="file" accept="image/*" onChange={(e) => { setImageFile(e.target.files?.[0] || null); setPreviewUrl(null); }} className="block w-full border border-dashed rounded-lg p-3 text-sm text-gray-500" />
          {previewUrl && <img src={previewUrl} alt="preview" className="mt-3 w-48 h-48 object-cover rounded" />}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">事件类型</label>
            <Input placeholder="例如：读书、电影、思考..." value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">地点</label>
            <Input placeholder="在哪里获得的灵感？" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <Button variant="secondary" onClick={onClose} className="min-w-[60px] h-10">取消</Button>
          <Button onClick={handleSubmit} className={`min-w-[60px] h-10 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>{loading ? "记录中..." : "记录"}</Button>
        </div>
      </div>
    </div>
  );
};
