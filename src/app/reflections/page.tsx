// src/app/reflections/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, Edit, Trash2 } from "lucide-react";
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
  const [filteredReflections, setFilteredReflections] = useState<Reflection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"text" | "event" | "location" | "inspiration">("text");

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
    setFilteredReflections(withUrls);
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

  // 执行搜索
  const performSearch = () => {
    let results = [...reflections];
    
    if (searchTerm.trim()) {
      switch (searchType) {
        case "text":
          results = results.filter(reflection => 
            reflection.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (reflection.source_type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
        case "event":
          results = results.filter(reflection => 
            (reflection.source_type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (reflection.source?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
        case "location":
          results = results.filter(reflection => 
            (reflection.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
        case "inspiration":
          results = results.filter(reflection => 
            reflection.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (reflection.source?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
      }
    }
    
    setFilteredReflections(results);
  };

  // 重置搜索
  const resetSearch = () => {
    setSearchTerm("");
    setFilteredReflections(reflections);
  };

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

      {/* 搜索区域 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索类型</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "text" | "event" | "location" | "inspiration")}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="text">文本</option>
              <option value="event">事件/标签</option>
              <option value="location">地点</option>
              <option value="inspiration">灵感来源</option>
            </select>
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索内容</label>
            <Input
              placeholder={`输入${searchType === "event" ? "事件或标签" : searchType === "location" ? "地点" : searchType === "inspiration" ? "灵感来源" : "内容"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="md:col-span-2">
            <Button 
              onClick={performSearch}
              className="w-full flex items-center justify-center"
            >
              <Search size={16} className="mr-1" /> 搜索
            </Button>
          </div>
          
          <div className="md:col-span-2">
            <Button 
              variant="secondary"
              onClick={resetSearch}
              className="w-full"
            >
              重置
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReflections.length === 0 ? (
          <div className="text-center py-12 text-gray-500 col-span-2">
            {searchTerm ? "没有找到匹配的感悟记录" : "暂无感悟记录，点击上方按钮记录第一个感悟吧！"}
          </div>
        ) : (
          filteredReflections.map((reflection) => (
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