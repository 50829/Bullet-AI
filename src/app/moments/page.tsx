// app/moments/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, MapPin, Trash2, Menu } from "lucide-react";
import { MomentModal } from "../components/MomentModal";
import { useAppContext } from "../../context/AppContext";

type Moment = {
  id: number;
  created_at: string;
  content: string;
  event_type: string;
  location: string;
  image_url?: string | null;
  image_path?: string | null;
  tags?: string[];
  date?: string;
};

// 定义搜索类型
type SearchType = "text" | "event" | "location";

export default function MomentsPage() {
  const { moments, loading, refreshMoments, deleteMoment } = useAppContext();
  const [filteredMoments, setFilteredMoments] = useState<Moment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("text");
  const [showSearch, setShowSearch] = useState(false); // 新增状态控制搜索栏显示
  const [isMobile, setIsMobile] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 初始过滤
  useEffect(() => {
    setFilteredMoments(moments);
  }, [moments]);

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
    refreshMoments();
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedMoment) return;

    try {
      // 使用全局状态中的删除函数
      await deleteMoment(selectedMoment.id, selectedMoment.image_path);
      setShowConfirm(false);
      setSelectedMoment(null);
    } catch (err) {
      console.error("删除异常:", err);
      alert("删除失败，请稍后重试");
    }
  };

  if (loading.moments) return <div className="text-center py-8">记忆生成中...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/70 via-white/70 to-orange-100/70 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-md">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">我的时刻</h2>
              <p className="text-gray-500 mt-1">珍藏每一个值得记录的瞬间</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
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

          {/* 搜索栏 - 条件渲染 */}
          {showSearch && (
            <div className="p-4 border-t border-orange-200/50">
              <div className="grid grid-cols-1 gap-3">
                <div>
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

                <div>
                  <Input 
                    placeholder="选择搜索类型，再输入搜索内容~" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full h-10"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={performSearch} 
                    className="flex-1 flex items-center justify-center h-10"
                  >
                    <Search size={16} className="mr-1" /> 搜索
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={clearSearch} 
                    className="flex-1 h-10"
                  >
                    清空
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className="flex-1">
        <div className="p-4 pt-0">
          <div className="max-w-6xl mx-auto">
            <div className="space-y-6">
              {filteredMoments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? "没有找到匹配的时刻记录" : "暂无时刻记录，点击上方按钮记录第一个时刻吧！"}
                </div>
              ) : (
                filteredMoments.map((moment) => (
                  <Card 
                    key={moment.id} 
                    className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200 w-full max-w-3xl mx-auto"
                  >
                    <div className="flex flex-col gap-4">
                      {/* 文字区域 */}
                      <div className="min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-lg text-gray-400 mb-2">{moment.date}</p>
                          <div className="flex justify-end mt-2 space-x-3 text-gray-400">
                            <Trash2 size={18} className="cursor-pointer hover:text-orange-400" onClick={() => { setSelectedMoment(moment); setShowConfirm(true); }} />
                          </div>
                        </div>
                        
                        <p className="text-xl text-gray-700 mt-2 whitespace-pre-line">
                          {moment.content}
                        </p>
                      </div>
                      
                      {/* 图片区域 - 放在文字下方 */}
                      {moment.image_url && (
                        <div className="flex justify-center">
                          <img 
                            src={moment.image_url} 
                            alt="时刻图片" 
                            className="w-full max-w-md h-auto rounded-lg object-cover" 
                          />
                        </div>
                      )}
                      
                      {/* 标签区域 - 放在图片下方 */}
                      {(moment.tags?.length > 0 || moment.event_type || moment.location) && (
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
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <MomentModal isOpen={isModalOpen} onClose={handleModalClose} onSuccess={handleModalSuccess} />

      {showConfirm && selectedMoment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200 max-w-sm w-full mx-4">
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
  );
}