// app/moments/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, MapPin, Trash2, Menu, X } from "lucide-react";
import { MomentModal } from "../components/MomentModal";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook

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


export default function MomentsPage() {
  const { moments, loading, refreshMoments, deleteMoment } = useAppContext();
  const { t } = useLanguage(); // 获取翻译函数
  const [filteredMoments, setFilteredMoments] = useState<Moment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null); // 用于存储要删除的moment
  const [searchTerm, setSearchTerm] = useState("");
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
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(m =>
        m.content?.toLowerCase().includes(searchLower) ||
        m.event_type?.toLowerCase().includes(searchLower) ||
        m.location?.toLowerCase().includes(searchLower) ||
        (m.tags ?? []).some(t => t.toLowerCase().includes(searchLower))
      );
    }
    setFilteredMoments(results);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredMoments(moments); // 显示全部帖子
  };

  const handleAddMoment = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalSuccess = () => {
    refreshMoments();
    setIsModalOpen(false);
  };

  // 修改 handleDelete 函数以实现即时关闭面板
  const handleDelete = async () => {
    if (!selectedMoment) return;

    // --- 关键修改：立即关闭确认面板和清除选中项 ---
    setShowConfirm(false);
    const momentToDelete = selectedMoment; // 保存要删除的moment引用
    setSelectedMoment(null); // 立即清除选中项

    try {
      // 使用全局状态中的删除函数
      await deleteMoment(momentToDelete.id, momentToDelete.image_path);
      // 乐观更新已完成，无需额外操作
    } catch (err) {
      console.error("删除异常:", err);
      alert(t("deleteFailed") || "删除失败，请稍后重试");
      // 如果删除失败，刷新数据以确保状态同步
      refreshMoments();
    }
  };

  if (loading.moments) return <div className="text-center py-8">{t("loading.moments") || "记忆生成中..."}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/70 via-white/70 to-orange-100/70 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-md">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{t("moments") || "我的时刻"}</h2>
              <p className="text-gray-500 mt-1">{t("momentsDescription") || "珍藏每一个值得记录的瞬间"}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* 搜索按钮 */}
              <Button 
                variant="outline" 
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-1"
              >
                <Search size={16} /> 
                {showSearch ? t("collapseSearch") || '折叠搜索栏' : t("search") || '搜索'}
              </Button>
              <Button onClick={handleAddMoment}>{t("addNewMoment") || '+ 记录新时刻'}</Button>
            </div>
          </div>

          {/* 搜索栏 - 条件渲染 */}
          {showSearch && (
            <div className="p-4 border-t border-orange-200/50">
              <div className="flex gap-2 items-center">
                <Input 
                  placeholder={t("searchPlaceholder") || "输入搜索内容~"} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      performSearch();
                    }
                  }}
                  className="flex-1 h-10"
                />
                <Button 
                  onClick={performSearch} 
                  className="flex items-center justify-center h-10 px-4"
                >
                  <Search size={16} className="mr-1" /> {t("search") || "搜索"}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={clearSearch} 
                  className="h-10 px-4"
                  disabled={!searchTerm}
                >
                  <X size={16} className="mr-1" /> {t("clear") || "清空"}
                </Button>
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
                  {searchTerm ? t("noMatches") || "没有找到匹配的时刻记录" : t("noRecords") || "暂无时刻记录，点击上方按钮记录第一个时刻吧！"}
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

      {/* 修改确认对话框 - 确保在 selectedMoment 存在时才渲染 */}
      {showConfirm && selectedMoment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-4 text-center">{t("confirmDelete") || "确认删除这条时刻吗？"}</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">{t("cannotRecover") || "删除后无法恢复。"}</p>
            <div className="flex justify-center space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => { 
                  setShowConfirm(false); 
                  setSelectedMoment(null); // 点击取消也清除选中项
                }}
              >
                {t("cancel") || "取消"}
              </Button>
              <Button 
                variant="primary" 
                className="bg-red-500 hover:bg-red-600 text-white" 
                onClick={handleDelete} // 点击后立即关闭面板
              >
                {t("confirm") || "确认删除"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}