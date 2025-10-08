// src/app/reflections/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Edit, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { ReflectionModal } from "../components/ReflectionModal";

type Reflection = {
  id: number;
  created_at: string;
  content: string;
  source: string | null;
  source_type: string | null;
  location: string | null;
  image_url: string | null; // 用于展示（签名 URL）
  image_path: string | null; // 存在 DB，用于删除和重新生成签名 URL
  date?: string;
};

export default function ReflectionsPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const fetchReflections = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      console.warn("未登录用户");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取感悟失败:", error);
      setLoading(false);
      return;
    }

    // 为有 image_path 的记录生成签名 URL（并发）
    const withUrls = await Promise.all(
      (data || []).map(async (item: Reflection) => {
        let signedUrl: string | null = item.image_url ?? null;
        if (!signedUrl && item.image_path) {
          const { data: urlData, error: urlErr } = await supabase.storage
            .from("reflections")
            .createSignedUrl(item.image_path, 60 * 60); // 1 小时
          if (!urlErr) {
            signedUrl = urlData?.signedUrl ?? null;
          } else {
            console.error("生成签名URL失败:", urlErr);
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
    setLoading(false);
  };

  const handleDelete = async (reflection: Reflection) => {
    const confirmed = window.confirm("确定要删除这条感悟吗？");
    if (!confirmed) return;

    // 先删除图片（如果有）
    if (reflection.image_path) {
      const { error: storageError } = await supabase.storage
        .from("reflections")
        .remove([reflection.image_path]);
      if (storageError) {
        console.error("删除图片失败:", storageError);
      }
    }

    // 删除数据库记录
    const { error } = await supabase
      .from("reflections")
      .delete()
      .eq("id", reflection.id);

    if (error) {
      console.error("删除感悟失败:", error);
      alert("删除失败，请重试");
    } else {
      alert("删除成功");
      fetchReflections();
    }
  };

  useEffect(() => {
    fetchReflections();
  }, []);

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">我的感悟</h2>
          <p className="text-gray-500 mt-1">记录生活中的灵感与思考</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ 记录新感悟</Button>
      </div>

      <div className="mb-6">
        <Input placeholder="搜索感悟..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reflections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无感悟记录，点击上方按钮记录第一个感悟吧！
          </div>
        ) : (
          reflections.map((reflection) => (
            <Card key={reflection.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-400 mb-2">{reflection.date}</p>
                  <p className="text-gray-700 mb-4">{reflection.content}</p>

                  {reflection.image_url && (
                    <img
                      src={reflection.image_url}
                      alt="感悟图片"
                      className="w-full rounded-lg mb-4 object-cover"
                    />
                  )}

                  <div className="flex items-center space-x-2">
                    {reflection.source_type && <Tag>{reflection.source_type}</Tag>}
                    {reflection.source && (
                      <span className="text-sm text-gray-500">{reflection.source}</span>
                    )}
                  </div>

                  {reflection.location && (
                    <p className="text-sm text-gray-400 mt-2">地点：{reflection.location}</p>
                  )}
                </div>

                <div className="flex space-x-3 text-gray-400">
                  <Edit
                    size={18}
                    className="cursor-pointer hover:text-gray-600"
                    onClick={() => alert("编辑功能待开发")}
                  />
                  <Trash2
                    size={18}
                    className="cursor-pointer hover:text-red-500"
                    onClick={() => handleDelete(reflection)}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <ReflectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchReflections}
      />
    </div>
  );
}
