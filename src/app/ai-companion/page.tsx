"use client";
import React, { useState } from 'react';
import { Send } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AICompanionPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的AI树洞，基于你记录的所有时刻、感悟和目标，我会陪你深入聊天，倾听你的心声。有什么想和我分享的吗？🔮'
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
        content: '抱歉，出了点问题，请稍后再试。'
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
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">AI树洞</h2>
        <p className="text-gray-500 mt-1">基于你的记录，与你深入对话</p>
      </div>
      
      <div className="flex-1 flex flex-col justify-between bg-white rounded-lg p-4 border border-gray-100">
        {/* 聊天历史 */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block p-4 rounded-xl max-w-xl ${
                  message.role === 'user'
                    ? 'bg-blue-100 text-gray-800'
                    : 'bg-purple-50 text-gray-700'
                }`}
              >
                <p className="leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-4 text-left">
              <div className="bg-purple-50 p-4 rounded-xl max-w-xl">
                <p className="text-gray-700">思考中...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="mt-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的想法..."
              className="flex-1 bg-transparent px-2 focus:outline-none text-gray-700"
              disabled={isLoading}
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}