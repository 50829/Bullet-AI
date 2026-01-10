// src/app/components/AIChatPanel.tsx
"use client";
import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
        } catch (e) {
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

  if (!isOpen) return null;

  return (
    <>
      {/* 移动端遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        onClick={onClose}
      />
      {/* AI 对话面板 */}
      <div className="fixed left-0 top-0 h-full w-full lg:w-[520px] bg-gradient-to-br from-blue-100/30 via-white/30 to-orange-100/30 border-r border-orange-200/50 shadow-2xl z-40 flex flex-col backdrop-blur-lg">
      {/* 头部 */}
      <div className="p-4 border-b border-orange-200/50 flex items-center justify-between bg-white/20 backdrop-blur-sm">
        <h3 className="text-2xl font-bold text-gray-800">{t("aiAssistant") || "AI助手"}</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-orange-100/50 transition-colors"
          aria-label="关闭"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* 聊天内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-xl backdrop-blur-md ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white shadow-lg'
                  : 'bg-gradient-to-r from-orange-200/60 to-yellow-100/60 text-gray-800 shadow-lg'
              }`}
            >
              <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
      <div className="p-4 border-t border-orange-200/50 bg-white/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md rounded-lg p-2 border border-orange-200/50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
            className="flex-1 bg-transparent px-2 focus:outline-none text-base text-gray-700"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
