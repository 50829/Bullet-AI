// app/reflections/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Tag } from "../components/ui/Tag";
import { Search, MapPin, Trash2, X, Sparkles, Lightbulb } from "lucide-react";
import { ReflectionModal } from "../components/ReflectionModal";
import { AIChatPanel } from "../components/AIChatPanel";
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


export default function ReflectionsPage() {
  const { reflections, loading, refreshReflections, deleteReflection } = useAppContext();
  const { t, language } = useLanguage(); // 获取翻译函数和语言设置
  const [filteredReflections, setFilteredReflections] = useState<Reflection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null); // 用于存储要删除的reflection
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

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
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(r =>
        r.content?.toLowerCase().includes(searchLower) ||
        (r.source_type?.toLowerCase().includes(searchLower) ?? false) ||
        (r.source?.toLowerCase().includes(searchLower) ?? false) ||
        (r.location?.toLowerCase().includes(searchLower) ?? false)
      );
    }
    setFilteredReflections(results);
  };

  const clearSearch = () => {
    setSearchTerm("");
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
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/30 via-white/30 to-orange-100/30 rounded-3xl shadow-lg border border-gray-200/50 backdrop-blur-lg">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/40 backdrop-blur-md p-2 rounded-full shadow-sm">
                <Lightbulb size={24} className="text-gray-700" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">{t("insights") || "我的感悟"}</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* AI思维助手按钮 */}
              <Button 
                variant="outline" 
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center gap-1"
              >
                <Sparkles size={16} /> 
                {t("aiThoughtAssistant") || "AI思维助手"}
              </Button>
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
            <div className="p-4 border-t border-gray-200/50">
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

      {/* AI对话面板 */}
      <AIChatPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        title={t("aiThoughtAssistant") || "AI思维助手"}
        greeting={t("aiThoughtAssistantGreeting") || "你好！我是你的AI思维助手，专注于和你探讨哲学思想、人生智慧等深刻的感悟话题。让我们一起思考生活的意义吧！✨"}
        systemPrompt={
          language === "en"
            ? "You are the user's AI Thought Assistant, focused on exploring philosophical ideas, life wisdom, and profound insights. Please strictly follow these rules:\n" +
              "1. Your responses must be profound, inspiring, and philosophical, using the same language as the user. Please respond in English.\n" +
              "2. Based on the insights and thoughts shared by the user, provide deep insights and inspiration.\n" +
              "3. You can quote philosophical ideas, famous quotes, and classic theories to enrich the conversation.\n" +
              "4. Maintain the depth and thoughtfulness of the conversation, guiding users to think more deeply.\n" +
              "5. When users express confusion or uncertainty, provide wise guidance and inspiration."
            : "你是用户的 AI 思维助手，专注于探讨哲学思想、人生智慧、生活感悟等深刻话题。请严格遵守以下规则：\n" +
              "1. 回答必须深刻、有启发性、富有哲理，且使用与用户相同的语言。请使用中文回复。\n" +
              "2. 基于用户分享的感悟和思考，给予深入的见解和启发。\n" +
              "3. 可以引用哲学思想、名人名言、经典理论来丰富对话。\n" +
              "4. 保持对话的深度和思考性，引导用户进行更深层次的思考。\n" +
              "5. 当用户表达困惑或迷茫时，给予智慧的指引和启发。"
        }
      />

      {/* 内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className={`flex-1 transition-all duration-300 ${showAIPanel ? 'lg:ml-96' : ''}`}>
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
                    className="bg-gradient-to-br from-blue-100/30 via-white/30 to-orange-100/30 backdrop-blur-lg p-4 rounded-3xl shadow-lg border border-gray-200/50 w-full max-w-3xl mx-auto"
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
          <div className="bg-gradient-to-br from-blue-100 via-white to-orange-100 p-4 rounded-2xl shadow-md border border-gray-300 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">
              {t("confirmDelete") || "确认删除这条感悟吗？"}
            </h2>
            <p className="text-gray-600 text-base mb-4 text-center">
              {t("cannotRecover") || "删除后不可恢复"}
            </p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => { 
                  setShowConfirm(false); 
                  setSelectedReflection(null); // 点击取消也清除选中项
                }}
                className="px-4 py-2 rounded-lg font-semibold transition-colors border-2 border-black bg-white text-black hover:bg-black hover:text-white hover:border-black text-base"
              >
                {t("cancel") || "取消"}
              </button>
              <button 
                className="px-4 py-2 rounded-lg font-semibold transition-colors border-2 border-red-500 bg-white text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 text-base" 
                onClick={handleDelete} // 点击后立即关闭面板
              >
                {t("confirm") || "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}