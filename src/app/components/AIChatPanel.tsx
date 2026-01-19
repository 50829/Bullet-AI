// src/app/components/AIChatPanel.tsx
"use client";
import React, { useState } from 'react';
import { Send } from 'lucide-react';
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
  title?: string;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ isOpen, onClose, greeting, systemPrompt, title }) => {
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

  return (
    <>
      {/* 移动端遮罩层 */}
      <div 
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* AI 对话面板 */}
      <div className={`fixed right-4 top-16 bottom-0 w-full lg:w-[520px] bg-gray-100/85 rounded-tl-3xl rounded-tr-3xl shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
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
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-orange-200/60 to-yellow-100/60 backdrop-blur-md p-3 rounded-3xl max-w-[80%] shadow-lg">
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
            placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
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
