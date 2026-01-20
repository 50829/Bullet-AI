// app/reflections/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Trash2, Save, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { AIChatPanel } from "../components/AIChatPanel";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook
import { supabase } from "../../lib/supabaseClient";
import { useTopBar } from '../components/layout/TopBar';

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
  const { reflections, loading, refreshReflections, deleteReflection, updateReflection } = useAppContext();
  const { t, language } = useLanguage(); // 获取翻译函数和语言设置
  const { setTopBarHandlers } = useTopBar();
  const [filteredReflections, setFilteredReflections] = useState<Reflection[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null); // 用于存储要删除的reflection
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  
  // 折叠状态管理
  const [collapsedReflections, setCollapsedReflections] = useState<Set<number>>(new Set());

  // 检测屏幕尺寸
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // 切换折叠状态
  const toggleReflection = (reflectionId: number) => {
    setCollapsedReflections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reflectionId)) {
        newSet.delete(reflectionId);
      } else {
        newSet.add(reflectionId);
      }
      return newSet;
    });
  };

  // 获取标题首字符用于排序
  const getTitleFirstChar = (reflection: Reflection): string => {
    const contentLines = reflection.content.split('\n\n');
    const hasTitle = contentLines.length > 1 && contentLines[0].trim().length > 0 && contentLines[0].trim().length < 100;
    const title = hasTitle ? contentLines[0].trim() : reflection.content.trim();
    if (!title) return 'ZZZ'; // 没有标题的排在最后
    const firstChar = title.charAt(0).toUpperCase();
    // 如果是中文字符，返回拼音首字母或直接返回字符
    if (/[\u4e00-\u9fa5]/.test(firstChar)) {
      return firstChar;
    }
    // 如果是英文字母或数字，直接返回
    if (/[A-Z0-9]/.test(firstChar)) {
      return firstChar;
    }
    // 其他字符排在最后
    return 'ZZZ';
  };

  // 初始过滤和排序
  useEffect(() => {
    const sorted = [...reflections].sort((a, b) => {
      const charA = getTitleFirstChar(a);
      const charB = getTitleFirstChar(b);
      return charA.localeCompare(charB, 'zh-CN');
    });
    setFilteredReflections(sorted);
  }, [reflections]);

  const handleAddReflection = () => {
    setIsCreatingNew(true);
    setNewTitle("");
    setNewContent("");
  };

  // 注册 TopBar 回调
  useEffect(() => {
    setTopBarHandlers({
      onAddReflection: handleAddReflection,
      onToggleAIPanel: () => setShowAIPanel(!showAIPanel),
      showAIPanel,
    });
  }, [setTopBarHandlers, showAIPanel]);

  const handleCancelNew = () => {
    setIsCreatingNew(false);
    setNewTitle("");
    setNewContent("");
  };

  const handleSaveNew = async () => {
    if (!newTitle.trim()) {
      alert(t("pleaseEnterTitle") || "请填写标题");
      return;
    }
    if (!newContent.trim()) {
      alert(t("pleaseEnterContent") || "请填写感悟内容");
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        alert(t("pleaseLogin") || "请先登录！");
        setIsSaving(false);
        return;
      }

      // 标题和正文合并到content中
      const contentToSave = `${newTitle.trim()}\n\n${newContent.trim()}`;

      const { error } = await supabase.from("reflections").insert({
        user_id: user.id,
        content: contentToSave,
      });

      if (error) {
        console.error("写入 reflections 失败:", error);
        alert(t("publishFailed") || "发布失败，请重试");
      } else {
        refreshReflections();
        setIsCreatingNew(false);
        setNewTitle("");
        setNewContent("");
      }
    } catch (err) {
      console.error("提交错误:", err);
      alert(t("publishFailed") || "发布异常，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (reflection: Reflection) => {
    const contentLines = reflection.content.split('\n\n');
    const hasTitle = contentLines.length > 1 && contentLines[0].trim().length > 0 && contentLines[0].trim().length < 100;
    const title = hasTitle ? contentLines[0].trim() : "";
    const content = hasTitle ? contentLines.slice(1).join('\n\n') : reflection.content;
    
    setEditingReflection(reflection);
    setEditTitle(title);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingReflection(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingReflection) return;
    
    if (!editTitle.trim()) {
      alert(t("pleaseEnterTitle") || "请填写标题");
      return;
    }
    if (!editContent.trim()) {
      alert(t("pleaseEnterContent") || "请填写感悟内容");
      return;
    }

    setIsSaving(true);
    try {
      const contentToSave = `${editTitle.trim()}\n\n${editContent.trim()}`;
      await updateReflection(editingReflection.id, { content: contentToSave });
      await refreshReflections();
      setEditingReflection(null);
      setEditTitle("");
      setEditContent("");
    } catch (err) {
      console.error("更新错误:", err);
      alert(t("updateFailed") || "更新失败，请重试");
    } finally {
      setIsSaving(false);
    }
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
      <div 
        className="flex-1 transition-all duration-300"
        style={showAIPanel && isDesktop ? { transform: 'translateX(-300px)' } : {}}
      >
        <div className="p-4 pt-0"> {/* 移除顶部padding，因为头部已固定 */}
          <div className="max-w-6xl mx-auto">
            <div className="space-y-6">
              {/* 新建感悟卡片 - 显示在列表顶部 */}
              {isCreatingNew && (
                <Card className="bg-gray-100 p-6 rounded-[28px] w-full max-w-3xl mx-auto">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-semibold text-gray-700">{t("newReflection") || "记录新感悟"}</h3>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">{t("title") || "标题"} *</label>
                      <Input
                        placeholder={t("enterTitle") || "输入标题（必填）"}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="mb-4"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">{t("content") || "内容 *"}</label>
                      <Textarea
                        placeholder={t("recordThoughts") || "记录你的思考和感悟..."}
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-4">
                      <Button
                        variant="secondary"
                        onClick={handleCancelNew}
                        className={isSaving ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                      >
                        {t("cancel") || "取消"}
                      </Button>
                      <Button
                        onClick={handleSaveNew}
                        className={`flex items-center gap-2 ${(isSaving || !newTitle.trim() || !newContent.trim()) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                      >
                        <Save size={16} />
                        {isSaving ? t("saving") || "保存中..." : t("save") || "保存"}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {filteredReflections.length === 0 && !isCreatingNew && !editingReflection ? (
                <div className="text-center py-12 text-gray-500">
                  {t("noRecords") || "暂无感悟记录，点击上方按钮记录第一个感悟吧！"}
                </div>
              ) : (
                filteredReflections.map((reflection) => {
                  // 如果是正在编辑的reflection，显示编辑表单
                  if (editingReflection && editingReflection.id === reflection.id) {
                    return (
                      <Card 
                        key={reflection.id} 
                        className="bg-gray-100 p-6 rounded-[28px] w-full max-w-3xl mx-auto"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-semibold text-gray-700">{t("editReflection") || "编辑感悟"}</h3>
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">{t("title") || "标题"} *</label>
                            <Input
                              placeholder={t("enterTitle") || "输入标题（必填）"}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="mb-4"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">{t("content") || "内容"} *</label>
                            <Textarea
                              placeholder={t("recordThoughts") || "记录你的思考和感悟..."}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[200px]"
                            />
                          </div>
                          
                          <div className="flex justify-end gap-3 mt-4">
                            <Button
                              variant="secondary"
                              onClick={handleCancelEdit}
                              className={isSaving ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                            >
                              {t("cancel") || "取消"}
                            </Button>
                            <Button
                              onClick={handleSaveEdit}
                              className={`flex items-center gap-2 ${(isSaving || !editTitle.trim() || !editContent.trim()) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                            >
                              <Save size={16} />
                              {isSaving ? t("updating") || "更新中..." : t("update") || "更新"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  // 解析内容：如果有换行符分隔标题和正文，则分开显示
                  const contentLines = reflection.content.split('\n\n');
                  const hasTitle = contentLines.length > 1 && contentLines[0].trim().length > 0 && contentLines[0].trim().length < 100;
                  const displayTitle = hasTitle ? contentLines[0].trim() : null;
                  const displayContent = hasTitle ? contentLines.slice(1).join('\n\n') : reflection.content;
                  
                  const isCollapsed = collapsedReflections.has(reflection.id);
                  
                  return (
                    <Card 
                      key={reflection.id} 
                      className="group bg-white/80 p-4 rounded-[28px] w-full max-w-3xl mx-auto"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                          {/* 标题区域 - 带折叠按钮 */}
                          {displayTitle && (
                            <div 
                              className="flex items-center gap-2 border-b border-gray-200/50 pb-2 cursor-pointer hover:bg-gray-50/50 rounded-2xl p-2 -m-2 transition-colors mb-3"
                              onClick={() => toggleReflection(reflection.id)}
                            >
                              <button className="flex items-center justify-center w-5 h-5 hover:bg-gray-200 rounded transition-colors">
                                {isCollapsed ? (
                                  <ChevronDown size={14} className="text-gray-600" />
                                ) : (
                                  <ChevronUp size={14} className="text-gray-600" />
                                )}
                              </button>
                              <h3 className="text-2xl font-semibold text-gray-800 flex-1">{displayTitle}</h3>
                              <div className="flex justify-end space-x-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div title={t("edit") || "编辑"}>
                                  <Edit2 
                                    size={18} 
                                    className="cursor-pointer hover:text-blue-500 transition-colors" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(reflection);
                                    }} 
                                  />
                                </div>
                                <div title={t("delete") || "删除"}>
                                  <Trash2 
                                    size={18} 
                                    className="cursor-pointer hover:text-red-500 transition-colors" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReflection(reflection); 
                                      setShowConfirm(true);
                                    }} 
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 没有标题时显示编辑和删除按钮 */}
                          {!displayTitle && (
                            <div className="flex justify-end mb-3 space-x-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div title={t("edit") || "编辑"}>
                                <Edit2 
                                  size={18} 
                                  className="cursor-pointer hover:text-blue-500 transition-colors" 
                                  onClick={() => handleEdit(reflection)} 
                                />
                              </div>
                              <div title={t("delete") || "删除"}>
                                <Trash2 
                                  size={18} 
                                  className="cursor-pointer hover:text-red-500 transition-colors" 
                                  onClick={() => { 
                                    setSelectedReflection(reflection); 
                                    setShowConfirm(true);
                                  }} 
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* 内容区域 - 可折叠（有标题时）或直接显示（无标题时） */}
                          {(!displayTitle || !isCollapsed) && (
                            <p className="text-xl text-gray-700 whitespace-pre-line">{displayContent}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 修改确认对话框 - 确保在 selectedReflection 存在时才渲染 */}
      {showConfirm && selectedReflection && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#efeeeb] p-4 rounded-[28px] shadow-md max-w-sm w-full mx-4">
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
                className="px-4 py-2 rounded-3xl font-semibold transition-colors border-2 border-[#003049] bg-white text-[#003049] hover:bg-[#003049] hover:text-white hover:border-[#003049] text-base"
              >
                {t("cancel") || "取消"}
              </button>
              <button 
                className="px-4 py-2 rounded-3xl font-semibold transition-colors border-2 border-red-500 bg-white text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 text-base" 
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