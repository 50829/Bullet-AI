"use client"; // For input handling in a real app

import React from 'react';
import { Send } from 'lucide-react';

export default function AICompanionPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">AI树洞</h2>
        <p className="text-gray-500 mt-1">基于你的记录，与你深入对话</p>
      </div>
      
      <div className="flex-1 flex flex-col justify-between bg-white rounded-lg p-4 border border-gray-100">
        {/* Chat history would go here */}
        <div className="flex-1">
           <div className="bg-purple-50 p-6 rounded-xl max-w-xl">
             <h3 className="font-semibold text-lg text-purple-800 mb-2">对话空间</h3>
             <p className="text-gray-700 leading-relaxed">
               你好！我是你的AI树洞，基于你记录的所有时刻、感悟和目标，我会陪你深入聊天，倾听你的心声。有什么想和我分享的吗？🔮
             </p>
           </div>
        </div>
        
        {/* Input area */}
        <div className="mt-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-2">
            <input 
              type="text"
              placeholder="输入你的想法..."
              className="flex-1 bg-transparent px-2 focus:outline-none text-gray-700"
            />
            <button className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};