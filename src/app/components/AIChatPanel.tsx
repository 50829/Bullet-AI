// src/app/components/AIChatPanel.tsx
"use client";
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Drawer } from './ui/Drawer';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  greeting: string;
  systemPrompt: string;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ isOpen, onClose, greeting, systemPrompt }) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: greeting
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
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
          systemPrompt: systemPrompt, // 传递自定义系统提示
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
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `抱歉，${error.message}` 
          : (t("aiError") || '抱歉，出了点问题，请稍后再试。')
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={t("aiAssistant") || "AI Assistant"}>
      {/* 聊天内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] rounded-xl px-3 py-2 shadow-sm ${
                message.role === 'user'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                  : 'border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
              }`}
            >
              <p className="text-sm leading-6 whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[82%] rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm">
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
            placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
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
