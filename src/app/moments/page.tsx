"use client";
import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, MapPin, Tag as TagIcon, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { MomentModal } from "../components/MomentModal";

type Moment = {
  id: number;
  created_at: string;
  content: string;
  event_type: string;
  location: string;
  image_url: string | null;
  image_path: string | null;
  tags: string[];
  date?: string;
};

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [filteredMoments, setFilteredMoments] = useState<Moment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"text" | "event" | "location">("text");

  const fetchMoments = async () => {
    setLoading(true);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.warn("获取用户信息失败:", userErr);
      setLoading(false);
      return;
    }
    const user = userData?.user;
    if (!user) {
      console.warn("未登录用户");
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
    } else {
      const formatted = data.map((moment) => ({
        ...moment,
        date: formatDate(moment.created_at),
      }));
      setMoments(formatted);
      setFilteredMoments(formatted); // 初始化时显示所有数据
    }
    setLoading(false);
  };

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

  useEffect(() => {
    fetchMoments();
  }, []);

  // 执行搜索
  const performSearch = () => {
    let results = [...moments];
    
    if (searchTerm.trim()) {
      switch (searchType) {
        case "text":
          results = results.filter(moment => 
            moment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            moment.event_type.toLowerCase().includes(searchTerm.toLowerCase())
          );
          break;
        case "event":
          results = results.filter(moment => 
            moment.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            moment.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          break;
        case "location":
          results = results.filter(moment => 
            moment.location.toLowerCase().includes(searchTerm.toLowerCase())
          );
          break;
      }
    }
    
    setFilteredMoments(results);
  };

  // 重置搜索
  const resetSearch = () => {
    setSearchTerm("");
    setFilteredMoments(moments);
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
        fetchMoments(); // 重新获取数据
      }
    } catch (err) {
      console.error("删除异常:", err);
      alert("删除失败，请稍后重试");
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">我的时刻</h2>
          <p className="text-gray-500 mt-1">珍藏每一个值得记录的瞬间</p>
        </div>
        <Button onClick={handleAddMoment}>+ 记录新时刻</Button>
      </div>

      {/* 搜索区域 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索类型</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "text" | "event" | "location")}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="text">文本</option>
              <option value="event">事件/标签</option>
              <option value="location">地点</option>
            </select>
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索内容</label>
            <Input
              placeholder={`输入${searchType === "event" ? "事件或标签" : searchType === "location" ? "地点" : "内容"}...`}
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

      <div className="space-y-6">
        {filteredMoments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? "没有找到匹配的时刻记录" : "暂无时刻记录，点击上方按钮记录第一个时刻吧！"}
          </div>
        ) : (
          filteredMoments.map((moment) => (
            <Card key={moment.id} className="p-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">{moment.date}</p>
                <p className="text-lg text-gray-700 mb-4">{moment.content}</p>

                {/* 图片网格布局 */}
                {moment.image_url && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    <img
                      src={moment.image_url}
                      alt="时刻图片"
                      className="w-full rounded-lg object-cover aspect-square"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {moment.tags?.map((tag, index) => (
                    <Tag key={index}>{tag}</Tag>
                  ))}
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
                <Trash2
                  size={18}
                  className="cursor-pointer hover:text-red-500"
                  onClick={() => {
                    setSelectedMoment(moment);
                    setShowConfirm(true);
                  }}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      <MomentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {showConfirm && selectedMoment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-center">
              确认删除这条时刻吗？
            </h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              删除后无法恢复。
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedMoment(null);
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDelete}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}