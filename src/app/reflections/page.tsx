// app/reflections/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, MapPin, Trash2 } from "lucide-react";
import { ReflectionModal } from "../components/ReflectionModal";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook

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

type SearchType = "text" | "event" | "location" | "inspiration";

export default function ReflectionsPage() {
  const { reflections, loading, refreshReflections, deleteReflection } = useAppContext();
  const { t } = useLanguage(); // 获取翻译函数
  const [filteredReflections, setFilteredReflections] = useState<Reflection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null); // 用于存储要删除的reflection
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("text");
  const [showSearch, setShowSearch] = useState(false);
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
    setFilteredReflections(reflections);
  }, [reflections]);

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
    setSearchType("text");
    setFilteredReflections(reflections);
  };

  const handleAddReflection = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalSuccess = () => {
    refreshReflections();
    setIsModalOpen(false);
  };

  // 修改 handleDelete 函数以实现即时关闭面板
  const handleDelete = async () => {
    if (!selectedReflection) return;

    // --- 关键修改：立即关闭确认面板和清除选中项 ---
    setShowConfirm(false);
    const reflectionToDelete = selectedReflection; // 保存要删除的reflection引用
    setSelectedReflection(null); // 立即清除选中项

    try {
      // 使用全局状态中的删除函数
      await deleteReflection(reflectionToDelete.id, reflectionToDelete.image_path);
      // 乐观更新已完成，无需额外操作
    } catch (err) {
      console.error("删除异常:", err);
      alert(t("deleteFailed") || "删除失败，请稍后重试");
      // 如果删除失败，刷新数据以确保状态同步
      refreshReflections();
    }
  };

  if (loading.reflections) return <div className="text-center py-8">{t("loading.reflections") || "思考即将开始..."}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/70 via-white/70 to-orange-100/70 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-md">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{t("insights") || "我的感悟"}</h2>
              <p className="text-gray-500 mt-1">{t("insightsDescription") || "记录生活中的灵感与思考"}</p>
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
              <Button onClick={handleAddReflection}>{t("addNewReflection") || '+ 记录新感悟'}</Button>
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
                    <option value="text">{t("text") || "文本"}</option>
                    <option value="event">{t("event") || "事件"}</option>
                    <option value="location">{t("location") || "地点"}</option>
                    <option value="inspiration">{t("inspiration") || "灵感来源"}</option>
                  </select>
                </div>

                <div>
                  <Input 
                    placeholder={t("searchPlaceholder") || "选择搜索类型，再输入搜索内容~"} 
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
                    <Search size={16} className="mr-1" /> {t("search") || "搜索"}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={clearSearch} 
                    className="flex-1 h-10"
                  >
                    {t("clear") || "清空"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className="flex-1">
        <div className="p-4 pt-0"> {/* 移除顶部padding，因为头部已固定 */}
          <div className="max-w-6xl mx-auto">
            <div className="space-y-6">
              {filteredReflections.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? t("noMatches") || "没有找到匹配的感悟记录" : t("noRecords") || "暂无感悟记录，点击上方按钮记录第一个感悟吧！"}
                </div>
              ) : (
                filteredReflections.map((reflection) => (
                  <Card 
                    key={reflection.id} 
                    className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200 w-full max-w-3xl mx-auto"
                  >
                    <div className="flex flex-col gap-4"> {/* 垂直布局 */}
                      {/* 文字区域 */}
                      <div className="min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-lg text-gray-400 mb-2">{reflection.date}</p>
                          <div className="flex justify-end mt-2 space-x-3 text-gray-400">
                            <Trash2 
                              size={18} 
                              className="cursor-pointer hover:text-orange-400" 
                              onClick={() => { 
                                setSelectedReflection(reflection); 
                                setShowConfirm(true); 
                              }} 
                            />
                          </div>
                        </div>
                        
                        <p className="text-xl text-gray-700 mb-4 whitespace-pre-line">{reflection.content}</p> {/* 增大字体并添加换行支持 */}
                        
                        {/* 灵感来源 - 灰色斜体显示在文本下方 */}
                        {reflection.source && (
                          <p className="text-gray-500 italic mb-4">------ {reflection.source}</p>
                        )}
                      </div>
                      
                      {/* 图片区域 - 放在文字下方 */}
                      {reflection.image_url && (
                        <div className="flex justify-center">
                          <img 
                            src={reflection.image_url} 
                            alt="感悟图片" 
                            className="w-full max-w-md h-auto rounded-lg object-cover" 
                          />
                        </div>
                      )}
                      
                      {/* 标签区域 - 放在图片下方 */}
                      {(reflection.source_type || reflection.location) && (
                        <div className="flex flex-wrap gap-2">
                          {reflection.source_type && <Tag>{reflection.source_type}</Tag>}
                          {reflection.location && (
                            <Tag>
                              <MapPin size={14} className="inline mr-1" />
                              {reflection.location}
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

      {/* 模态框和确认对话框 */}
      <ReflectionModal isOpen={isModalOpen} onClose={handleModalClose} onSuccess={handleModalSuccess} />

      {/* 修改确认对话框 - 确保在 selectedReflection 存在时才渲染 */}
      {showConfirm && selectedReflection && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-4 text-center">{t("confirmDelete") || "确认删除这条感悟吗？"}</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">{t("cannotRecover") || "删除后无法恢复。"}</p>
            <div className="flex justify-center space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => { 
                  setShowConfirm(false); 
                  setSelectedReflection(null); // 点击取消也清除选中项
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