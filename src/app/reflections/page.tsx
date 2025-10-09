"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { ReflectionModal } from "../components/ReflectionModal";

type Reflection = {
  id: number;
  created_at: string;
  content: string;
  source?: string | null;
  source_type?: string | null;
  location?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

// 定义搜索类型
type SearchType = "text" | "event" | "location" | "inspiration";

export default function ReflectionsPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [filteredReflections, setFilteredReflections] = useState<Reflection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("text");
  const [showSearch, setShowSearch] = useState(false); // 新增状态控制搜索栏显示

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

    const withUrls = await Promise.all(
      (data || []).map(async (item: Reflection) => {
        let signedUrl: string | null = item.image_url ?? null;
        if (!signedUrl && item.image_path) {
          const { data: urlData, error: urlErr } = await supabase.storage
            .from("reflections")
            .createSignedUrl(item.image_path, 60 * 60); // 1 小时
          if (!urlErr && urlData) signedUrl = urlData.signedUrl ?? null;
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

  useEffect(() => {
    fetchReflections();
    const interval = setInterval(fetchReflections, 50 * 60 * 1000); // 每50分钟刷新签名
    return () => clearInterval(interval);
  }, []);

  const performSearch = () => {
    let results = [...reflections];
    if (searchTerm.trim()) {
      switch (searchType) {
        case "text":
          results = results.filter(r =>
            r.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.source_type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
        case "event":
          results = results.filter(r =>
            (r.source_type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (r.source?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
        case "location":
          results = results.filter(r =>
            (r.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
        case "inspiration":
          results = results.filter(r =>
            r.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.source?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          break;
      }
    }
    setFilteredReflections(results);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchType("text"); // 重置搜索类型为默认值
    setFilteredReflections(reflections); // 显示全部帖子
  };

  const handleDelete = async () => {
    if (!selectedReflection) return;
    try {
      if (selectedReflection.image_path) {
        const { error: storageError } = await supabase.storage
          .from("reflections")
          .remove([selectedReflection.image_path]);
        if (storageError) console.error("删除图片失败:", storageError);
      }

      const { error } = await supabase
        .from("reflections")
        .delete()
        .eq("id", selectedReflection.id);

      if (error) {
        console.error("删除感悟失败:", error);
        alert("删除失败，请重试");
      } else {
        setShowConfirm(false);
        setSelectedReflection(null);
        fetchReflections();
      }
    } catch (err) {
      console.error("删除异常:", err);
      alert("删除失败，请稍后重试");
    }
  };

  if (loading) return <div className="text-center py-8">思考即将开始...</div>;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题和按钮行 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">我的感悟</h2>
            <p className="text-gray-500 mt-1">记录生活中的灵感与思考</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 搜索按钮 */}
            <Button 
              variant="outline" 
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1"
            >
              <Search size={16} /> 
              {showSearch ? '折叠搜索栏' : '搜索'}
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>+ 记录新感悟</Button>
          </div>
        </div>

        {/* 搜索栏 - 条件渲染，只有在showSearch为true时才显示 */}
        {showSearch && (
          <div className="mb-6 p-4 bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg border border-orange-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-2">
                <select 
                  value={searchType} 
                  onChange={(e) => setSearchType(e.target.value as SearchType)} 
                  className="w-full p-2 border border-gray-300 rounded-md h-10"
                >
                  <option value="text">文本</option>
                  <option value="event">事件</option>
                  <option value="location">地点</option>
                  <option value="inspiration">灵感来源</option>
                </select>
              </div>

              <div className="md:col-span-6">
                <Input 
                  placeholder="选择搜索类型，再输入搜索内容~" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full h-10"
                />
              </div>

              <div className="md:col-span-2">
                <Button 
                  onClick={performSearch} 
                  className="w-full flex items-center justify-center h-10"
                >
                  <Search size={16} className="mr-1" /> 搜索
                </Button>
              </div>

              <div className="md:col-span-2">
                <Button 
                  variant="secondary" 
                  onClick={clearSearch} 
                  className="w-full h-10"
                >
                  清空
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReflections.length === 0 ? (
            <div className="text-center py-12 text-gray-500 col-span-2">
              {searchTerm ? "没有找到匹配的感悟记录" : "暂无感悟记录，点击上方按钮记录第一个感悟吧！"}
            </div>
          ) : (
            filteredReflections.map((reflection) => (
              <Card key={reflection.id} className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">{reflection.date}</p>
                    <p className="text-gray-700 mb-4">{reflection.content}</p>

                    {reflection.image_url && (
                      <img src={reflection.image_url} alt="感悟图片" className="w-full rounded-lg mb-4 object-cover" />
                    )}

                    <div className="flex items-center space-x-2">
                      {reflection.source_type && <Tag>{reflection.source_type}</Tag>}
                      {reflection.source && <span className="text-sm text-gray-500">{reflection.source}</span>}
                    </div>

                    {reflection.location && <p className="text-sm text-gray-400 mt-2">地点：{reflection.location}</p>}
                  </div>

                  <div className="flex justify-end mt-2 space-x-3 text-gray-400">
                    <Trash2 size={18} className="cursor-pointer hover:text-orange-400" onClick={() => { setSelectedReflection(reflection); setShowConfirm(true); }} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <ReflectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchReflections} />

        {showConfirm && selectedReflection && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200 max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4 text-center">确认删除这条感悟吗？</h2>
              <p className="text-gray-600 text-sm mb-4 text-center">删除后无法恢复。</p>
              <div className="flex justify-center space-x-3">
                <Button variant="secondary" onClick={() => { setShowConfirm(false); setSelectedReflection(null); }}>取消</Button>
                <Button variant="primary" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>确认删除</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}