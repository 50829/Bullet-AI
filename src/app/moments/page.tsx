"use client";
import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Edit, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { MomentModal } from "../components/MomentModal";

type Moment = {
  id: number;
  created_at: string;
  content: string;
  event_type: string;
  location: string;
  image_url: string | null;
  tags: string[];
  date?: string;
};

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 获取当前用户的时刻
  const fetchMoments = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
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

  const handleAddMoment = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalSuccess = () => {
    fetchMoments();
    setIsModalOpen(false);
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

      <div className="mb-6">
        <Input placeholder="搜索时刻..." />
      </div>

      <div className="space-y-6">
        {moments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无时刻记录，点击上方按钮记录第一个时刻吧！
          </div>
        ) : (
          moments.map((moment) => (
            <Card key={moment.id} className="p-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">{moment.date}</p>
                <p className="text-gray-700 mb-4">{moment.content}</p>

                {/* 图片放在文字下面 */}
                {moment.image_url && (
                  <img
                    src={moment.image_url}
                    alt="时刻图片"
                    className="w-full rounded-lg mb-4 object-cover"
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  {moment.tags?.map((tag, index) => (
                    <Tag key={index}>{tag}</Tag>
                  ))}
                  {moment.event_type && <Tag>{moment.event_type}</Tag>}
                  {moment.location && <Tag>{moment.location}</Tag>}
                </div>
              </div>
              <div className="flex justify-end mt-2 space-x-3 text-gray-400">
                <Edit size={18} className="cursor-pointer hover:text-gray-600" />
                <Trash2 size={18} className="cursor-pointer hover:text-red-500" />
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
    </div>
  );
}
