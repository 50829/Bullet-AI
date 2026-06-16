// src/app/components/AIGoalPlanningPanel.tsx
"use client";
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Drawer } from './ui/Drawer';

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
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply || t("aiError") || '抱歉，没有收到回复。',
        planData: data.plan || null,
      };

      if (!aiMessage.planData) {
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
    <Drawer isOpen={isOpen} onClose={onClose} title={t("aiPlanning") || "AI Planning"}>
        {/* 聊天内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[84%] rounded-xl px-3 py-2 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                    : 'border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
                }`}
              >
                <p className="text-sm leading-6 whitespace-pre-wrap">{message.content}</p>

                {/* 显示计划数据 */}
                {message.planData && (
                  <div className="mt-3 rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-3">
                    <h4 className="font-semibold text-sm mb-2">{t("aiGeneratedPlan") || "📋 AI生成的计划："}</h4>
                    
                    {message.planData.daily && message.planData.daily.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-xs text-[var(--color-text-secondary)] mb-1">{t("todayTasks") || "今日待办"} ({message.planData.daily.length})</h5>
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
                        <h5 className="font-medium text-xs text-[var(--color-text-secondary)] mb-1">{t("recentGoals") || "近期目标"} ({message.planData.future.length})</h5>
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
                          if (message.planData) {
                            handleAddGoals(message.planData);
                          }
                        }}
                        disabled={isAdding}
                        className="mt-3 w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
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
              <div className="max-w-[84%] rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm">
                <p className="text-sm text-[var(--color-text-primary)]">{t("aiThinking") || "思考中..."}</p>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-4">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t("aiGoalInputPlaceholder") || "输入你想完成的大目标..."}
              className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-[var(--color-primary)] p-2.5 text-[var(--color-text-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              aria-label={t("send") || "发送"}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
    </Drawer>
  );
};
