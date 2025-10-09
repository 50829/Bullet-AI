"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, MapPin, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { MomentModal } from "../components/MomentModal";

type Moment = {
  id: number;
  created_at: string;
  content: string;
  event_type: string;
  location: string;
  image_url?: string | null; // 运行时签名 URL
  image_path?: string | null; // 存库
  tags?: string[];
  date?: string;
};

// 定义搜索类型
type SearchType = "text" | "event" | "location"; // 移除了 inspiration

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [filteredMoments, setFilteredMoments] = useState<Moment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
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

  // 拉取 DB 记录并为每个有 image_path 的条目生成签名 URL
  const fetchMoments = async () => {
    setLoading(true);
    const {  data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("moments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取时刻失败:", error);
      setLoading(false);
      return;
    }

    const withUrls = await Promise.all(
      (data || []).map(async (item: Moment) => {
        let signedUrl: string | null = null;
        if (item.image_path) {
          const {  data: urlData, error: urlErr } = await supabase.storage
            .from("moments")
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

    setMoments(withUrls);
    setFilteredMoments(withUrls);
    setLoading(false);
  };

  useEffect(() => {
    fetchMoments();
    const interval = setInterval(fetchMoments, 50 * 60 * 1000); // 每 50 分钟刷新签名 URL
    return () => clearInterval(interval);
  }, []);

  const performSearch = () => {
    let results = [...moments];
    if (searchTerm.trim()) {
      switch (searchType) {
        case "text":
          results = results.filter(m =>
            m.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.event_type?.toLowerCase().includes(searchTerm.toLowerCase())
          );
          break;
        case "event":
          results = results.filter(m =>
            m.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.tags ?? []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          break;
        case "location":
          results = results.filter(m =>
            m.location?.toLowerCase().includes(searchTerm.toLowerCase())
          );
          break;
      }
    }
    setFilteredMoments(results);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchType("text"); // 重置搜索类型为默认值
    setFilteredMoments(moments); // 显示全部帖子
  };

  const handleAddMoment = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalSuccess = () => {
    fetchMoments();
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedMoment) return;

    try {
      if (selectedMoment.image_path) {
        const { error: storageError } = await supabase.storage
          .from("moments")
          .remove([selectedMoment.image_path]);
        if (storageError) console.error("删除图片失败:", storageError);
      }

      const { error: dbError } = await supabase
        .from("moments")
        .delete()
        .eq("id", selectedMoment.id);

      if (dbError) {
        console.error("删除时刻失败:", dbError);
        alert("删除失败，请重试");
      } else {
        setShowConfirm(false);
        setSelectedMoment(null);
        fetchMoments();
      }
    } catch (err) {
      console.error("删除异常:", err);
      alert("删除失败，请稍后重试");
    }
  };

  if (loading) return <div className="text-center py-8">记忆生成中...</div>;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">我的时刻</h2>
            <p className="text-gray-500 mt-1">珍藏每一个值得记录的瞬间</p>
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
            <Button onClick={handleAddMoment}>+ 记录新时刻</Button>
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
          {filteredMoments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 col-span-2">
              {searchTerm ? "没有找到匹配的时刻记录" : "暂无时刻记录，点击上方按钮记录第一个时刻吧！"}
            </div>
          ) : (
            filteredMoments.map((moment) => (
              <Card key={moment.id} className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">{moment.date}</p>
                    <p className="text-lg text-gray-700 mb-4">{moment.content}</p>

                    {moment.image_url ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                        <img src={moment.image_url} alt="时刻图片" className="w-full rounded-lg object-cover aspect-square" />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {(moment.tags ?? []).map((tag, i) => <Tag key={i}>{tag}</Tag>)}
                      {moment.event_type && <Tag>{moment.event_type}</Tag>}
                      {moment.location && (
                        <Tag>
                          <MapPin size={14} className="inline mr-1" />
                          {moment.location}
                        </Tag>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end mt-2 space-x-3 text-gray-400">
                    <Trash2 size={18} className="cursor-pointer hover:text-orange-400" onClick={() => { setSelectedMoment(moment); setShowConfirm(true); }} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <MomentModal isOpen={isModalOpen} onClose={handleModalClose} onSuccess={handleModalSuccess} />

        {showConfirm && selectedMoment && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200 max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4 text-center">确认删除这条时刻吗？</h2>
              <p className="text-gray-600 text-sm mb-4 text-center">删除后无法恢复。</p>
              <div className="flex justify-center space-x-3">
                <Button variant="secondary" onClick={() => { setShowConfirm(false); setSelectedMoment(null); }}>取消</Button>
                <Button variant="primary" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>确认删除</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}