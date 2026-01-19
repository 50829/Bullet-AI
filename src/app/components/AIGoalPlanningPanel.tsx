// src/app/components/AIGoalPlanningPanel.tsx
"use client";
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  planData?: {
    daily: { title: string, description: string }[];
    future: { title: string, description: string }[];
  } | null;
};

interface AIGoalPlanningPanelProps {
  isOpen: boolean;
  onClose: () => void;
  greeting: string;
  systemPrompt: string;
  onAddGoals: (plan: { daily: { title: string, description: string }[], future: { title: string, description: string }[] }) => Promise<void>;
}

export const AIGoalPlanningPanel: React.FC<AIGoalPlanningPanelProps> = ({ 
  isOpen, 
  onClose, 
  greeting, 
  systemPrompt,
  onAddGoals 
}) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: greeting,
      planData: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      planData: null
    };

    // 基于当前 messages 状态和新的 userMessage 构建要发送的消息列表
    const allMessages = [...messages, userMessage];
    
    // 排除初始问候语，只发送实际的对话消息
    const messagesToSend = allMessages
      .filter(msg => msg.role !== 'assistant' || msg.id !== '1')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    // 先更新 UI，添加用户消息
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          language: language || 'zh',
          systemPrompt: systemPrompt,
          purpose: 'planning',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get response';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("[AIGoalPlanningPanel] API响应数据:", data);
      console.log("[AIGoalPlanningPanel] Plan数据:", data.plan);
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply || t("aiError") || '抱歉，没有收到回复。',
        planData: data.plan || null,
      };

      // 如果planData存在，记录日志
      if (aiMessage.planData) {
        console.log("[AIGoalPlanningPanel] 成功解析计划数据:", aiMessage.planData);
        console.log("[AIGoalPlanningPanel] Daily任务数:", aiMessage.planData.daily?.length || 0);
        console.log("[AIGoalPlanningPanel] Future任务数:", aiMessage.planData.future?.length || 0);
      } else {
        console.warn("[AIGoalPlanningPanel] 未找到计划数据，AI回复内容:", data.reply);
      }

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `抱歉，${error.message}` 
          : (t("aiError") || '抱歉，出了点问题，请稍后再试。'),
        planData: null
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoals = async (plan: { daily: { title: string, description: string }[], future: { title: string, description: string }[] }) => {
    setIsAdding(true);
    try {
      await onAddGoals(plan);
      // 添加成功后可以显示成功消息
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t("goalsAddedSuccessfully") || "✅ 目标已成功添加到迁移列表！",
        planData: null
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Error adding goals:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `❌ ${error.message}` 
          : (t("addGoalsFailed") || '添加目标失败，请稍后再试。'),
        planData: null
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* 遮罩层 - 透明但可点击关闭 */}
      <div 
        className={`fixed inset-0 z-30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* AI 对话面板 */}
      <div 
        className={`fixed right-4 top-16 bottom-0 w-full lg:w-[520px] bg-gray-100/85 rounded-tl-3xl rounded-tr-3xl shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 聊天内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-3xl backdrop-blur-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white shadow-lg'
                    : 'bg-gradient-to-r from-orange-200/60 to-yellow-100/60 text-gray-800 shadow-lg'
                }`}
              >
                <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>

                {/* 显示计划数据 */}
                {message.planData && (
                  <div className="mt-3 p-3 bg-white/40 backdrop-blur-md rounded-lg border border-white/30 shadow-md">
                    <h4 className="font-semibold text-sm mb-2">{t("aiGeneratedPlan") || "📋 AI生成的计划："}</h4>
                    
                    {message.planData.daily && message.planData.daily.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-xs text-gray-600 mb-1">{t("todayTasks") || "今日待办"} ({message.planData.daily.length})</h5>
                        <ul className="text-xs space-y-1">
                          {message.planData.daily.map((task, index) => (
                            <li key={index} className="flex">
                              <span className="mr-1">•</span>
                              <strong>{task.title}:</strong> {task.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.planData.future && message.planData.future.length > 0 && (
                      <div>
                        <h5 className="font-medium text-xs text-gray-600 mb-1">{t("recentGoals") || "近期目标"} ({message.planData.future.length})</h5>
                        <ul className="text-xs space-y-1">
                          {message.planData.future.map((task, index) => (
                            <li key={index} className="flex">
                              <span className="mr-1">•</span>
                              <strong>{task.title}:</strong> {task.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 一键添加按钮 - 只有当有任务时才显示 */}
                    {message.planData && 
                     ((message.planData.daily && Array.isArray(message.planData.daily) && message.planData.daily.length > 0) || 
                      (message.planData.future && Array.isArray(message.planData.future) && message.planData.future.length > 0)) && (
                      <button
                        onClick={() => {
                          console.log("[AIGoalPlanningPanel] 点击一键添加，计划数据:", message.planData);
                          if (message.planData) {
                            handleAddGoals(message.planData);
                          }
                        }}
                        disabled={isAdding}
                        className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-3xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isAdding ? (t("adding") || "添加中...") : (t("addToMigrationList") || "一键添加到迁移列表")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-orange-200/60 to-yellow-100/60 backdrop-blur-md p-3 rounded-xl max-w-[80%] shadow-lg">
                <p className="text-base text-gray-800">{t("aiThinking") || "思考中..."}</p>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-gray-200/50 bg-white/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 bg-white/30 backdrop-blur-lg rounded-3xl p-3 border border-gray-200/50">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("aiGoalInputPlaceholder") || "输入你想完成的大目标..."}
              className="flex-1 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg text-lg text-gray-700"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-3xl bg-[#003049] text-white border-2 border-[#003049] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
