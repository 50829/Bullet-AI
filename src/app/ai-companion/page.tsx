// app/ai-companion/page.tsx
"use client";
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AICompanionPage() {
  const { t } = useLanguage(); // 获取翻译函数
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t("aiCaveGreeting") || '你好！我是你的AI树洞，基于你记录的所有时刻、感悟和目标，我会陪你深入聊天，倾听你的心声。有什么想和我分享的吗？🔮'
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
          messages: [
            ...messages.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            }))
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t("aiError") || '抱歉，出了点问题，请稍后再试。'
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
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/70 via-white/70 to-orange-100/70 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-md">
          {/* 标题行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{t("aiCaveTitle") || "AI树洞"}</h2>
              <p className="text-gray-500 mt-1">{t("aiCaveDescription") || "基于你的记录，与你深入对话"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 聊天内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className="flex-1">
        <div className="p-4 pt-0"> {/* 移除顶部padding，因为头部已固定 */}
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col justify-between bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg border border-orange-200 p-4 min-h-[calc(100vh-120px)]">
              {/* 聊天历史 */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={`inline-block p-4 rounded-xl max-w-xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'bg-gradient-to-r from-orange-200 to-yellow-100 text-gray-800'
                      }`}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="mb-4 text-left">
                    <div className="bg-gradient-to-r from-orange-200 to-yellow-100 p-4 rounded-xl max-w-xl">
                      <p className="text-gray-800">{t("aiThinking") || "思考中..."}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 输入区域 */}
              <div className="mt-4">
                <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-orange-200">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
                    className="flex-1 bg-transparent px-2 focus:outline-none text-gray-700"
                    disabled={isLoading}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="p-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}