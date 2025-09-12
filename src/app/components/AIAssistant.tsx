// src/components/AIAssistant.tsx
import { Bot, Plus } from "lucide-react";

export function AIAssistant() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">我的 AI 管家</h3>
        <button className="text-gray-400 hover:text-gray-600">
          <Plus size={20} />
        </button>
      </div>
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="bg-gray-200 p-2 rounded-full">
            <Bot size={20} className="text-gray-600" />
          </div>
          <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none">
            <p className="text-sm">老板好，欢迎上线，接下来怎么安排？</p>
          </div>
        </div>
        {/* 这里可以添加输入框和交互逻辑 */}
        <input
            type="text"
            placeholder="例如: 明天下午3点提醒我开会"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
        />
      </div>
    </div>
  );
}