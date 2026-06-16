// components/MomentModal.tsx
"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Input } from "./ui/Input";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook
import { useAppContext } from '../../context/AppContext'; // 添加 AppContext
import { useToast } from "./ui/Toast";

type Props = { isOpen: boolean; onClose: () => void; onSuccess: () => void; };

export const MomentModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { t } = useLanguage(); // 获取翻译函数
  const { addMoment, refreshMoments } = useAppContext(); // 获取添加和刷新函数
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    // 默认使用今天的日期，格式为 YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async (file: File) => {
    if (!file) return null;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      showToast({ type: "error", message: t("pleaseLogin") || "请先登录" });
      return null;
    }

    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}.${ext}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("moments")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("图片上传失败:", uploadError);
      showToast({ type: "error", message: t("imageUploadFailed") || "图片上传失败，请重试" });
      return null;
    }

    // 为立即预览生成短期签名（不存 DB）
    const { data: signedData, error: signedError } = await supabase.storage
      .from("moments")
      .createSignedUrl(filePath, 60 * 60);

    if (!signedError && signedData) setPreviewUrl(signedData.signedUrl as string);

    return { path: filePath };
  };

  const handleSubmit = async () => {
    if (!content.trim()) { 
      showToast({ type: "error", message: t("contentCannotBeEmpty") || "内容不能为空" }); 
      return; 
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { 
      showToast({ type: "error", message: t("pleaseLogin") || "请先登录" }); 
      return; 
    }

    // 将选择的日期转换为 ISO 字符串，设置为 UTC 时间的当天 00:00:00
    const dateISO = `${selectedDate}T00:00:00.000Z`;

    // 如果有图片文件，创建本地预览 URL
    let localImageUrl: string | null = null;
    if (imageFile) {
      localImageUrl = URL.createObjectURL(imageFile);
    }

    // 创建临时 moment 对象（乐观更新）
    const tempMoment = {
      id: Date.now(), // 使用时间戳作为临时 ID
      user_id: user.id,
      content,
      image_path: null, // 暂时为 null,上传后更新
      image_url: localImageUrl || previewUrl, // 优先使用本地预览 URL
      created_at: dateISO,
      date: dateISO.split('T')[0],
    };

    // 立即添加到列表（乐观更新）
    addMoment(tempMoment);

    // 立即关闭模态框并重置表单
    onClose();
    const savedContent = content;
    const savedImageFile = imageFile;
    setContent(""); 
    setImageFile(null); 
    setPreviewUrl(null);
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);

    // 在后台异步保存到 Supabase
    (async () => {
      try {
        let imagePath: string | null = null;
        
        // 如果有图片，先上传
        if (savedImageFile) {
          const uploaded = await handleUpload(savedImageFile);
          imagePath = uploaded?.path ?? null;
        }

        // 构建插入数据
        const payload: { user_id: string; content: string; image_path: string | null; created_at: string } = {
          user_id: user.id,
          content: savedContent,
          image_path: imagePath,
          created_at: dateISO,
        };

        // 尝试插入数据
        let { error } = await supabase.from("moments").insert([payload]).select();
        
        // 如果直接设置 created_at 失败，尝试先插入后更新
        if (error && (error.code === '23502' || error.message?.includes('null value') || error.message?.includes('created_at'))) {
          delete payload.created_at;
          const { data: insertData, error: insertError } = await supabase.from("moments").insert([payload]).select();
          
          if (insertError) {
            error = insertError;
          } else {
            if (insertData && insertData[0] && insertData[0].id) {
              const { error: updateError } = await supabase
                .from("moments")
                .update({ created_at: dateISO })
                .eq("id", insertData[0].id);

              if (!updateError) {
                error = null;
              }
            }
          }
        }
        
        if (error) {
          console.error("保存失败:", error);
          // 如果保存失败，刷新列表以移除临时添加的 moment
          refreshMoments();
          showToast({ type: "error", message: t("publishFailed") || "发布失败，请重试" });
        } else {
          // 保存成功，刷新列表以获取正确的数据（包括数据库生成的 ID）
          refreshMoments();
          showToast({ type: "success", message: t("addSuccess") || "成功添加" });
        }
      } catch (err) {
        console.error("提交错误:", err);
        // 如果出错，刷新列表以移除临时添加的 moment
        refreshMoments();
        showToast({ type: "error", message: t("publishFailed") || "发布失败，请重试" });
      }
    })();

    // 调用成功回调
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--color-bg-surface)] p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">{t("newMoment") || "记录新时刻"}</h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">{t("date") || "日期"}</label>
          <Input 
            type="date"
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">{t("content") || "内容"}</label>
          <Textarea 
            placeholder={t("recordFeelings") || "记录这一刻的感受..."} 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            className="min-h-[120px] h-auto" 
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">{t("uploadImage") || "上传图片"}</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              setImageFile(e.target.files?.[0] || null);
              setPreviewUrl(null);
            }} 
            className="block w-full border border-dashed rounded-3xl p-3 text-sm text-gray-500" 
          />
          {previewUrl && <img src={previewUrl} alt="preview" className="mt-3 w-48 h-48 object-cover rounded" />}
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
            className="min-w-[60px] h-10"
          >
            {t("save") || "记录"}
          </Button>
        </div>
      </div>
    </div>
  );
};
