// src/components/AIAssistant.tsx
import { Bot, Plus, Send, FileEdit } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Task } from "../types";

type Message = { role: "user" | "ai"; text: string };

interface AIPlan {
  tasksDaily?: { title: string; description?: string }[];
  tasksFuture?: { title: string; description?: string }[];
}

export interface AIAssistantProps {
  tasks: Task[];
  onAddTasks?: (newTasks: Task[]) => void;
  t: {
    aiTitle: string;
    aiGreeting: string;
    aiThinking: string;
    aiError: string;
    planGenerated: string;
    oneClickAdd: string;
    todayPlanPrefix: string;
    futurePlanPrefix: string;
    aiPlaceholder: string;
  };
}

export function AIAssistant({
  tasks,
  onAddTasks,
  t,
}: AIAssistantProps) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: t.aiGreeting },
  ]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIPlan | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  /* ---------- 调后端 /api/ai ---------- */
  const handleSend = async () => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setText("");
    setLoading(true);
    setPlan(null);

    const body = { messages: [userMsg], tasks };
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setMessages((prev) => [...prev, { role: "ai", text: t.aiError }]);
      setLoading(false);
      return;
    }

    const json = await res.json();
    const { reply, plan } = json;
    if (reply) setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    if (plan && (plan.tasksDaily?.length || plan.tasksFuture?.length)) setPlan(plan);
    setLoading(false);
  };

  /* ---------- 一键添加计划任务 ---------- */
  const handleAddPlan = () => {
    if (!plan) return;
    const newTasks: Task[] = [
      ...(plan.tasksDaily ?? []).map((t) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        title: t.title,
        description: t.description,
        priority: "medium" as const,
        tags: [],
        startDate: null,
        dueDate: new Date(), // 今日任务
        isCompleted: false,
        createdAt: new Date(),
      })),
      ...(plan.tasksFuture ?? []).map((t) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        title: t.title,
        description: t.description,
        priority: "medium" as const,
        tags: [],
        startDate: null,
        dueDate: null, // 迁移列表
        isCompleted: false,
        createdAt: new Date(),
      })),
    ];
    onAddTasks?.(newTasks);
    setPlan(null);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">{t.aiTitle}</h3>
        <button className="text-gray-400 hover:text-gray-600">
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start space-x-3 ${msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
            {msg.role === "ai" && (
              <div className="bg-gray-200 p-2 rounded-full">
                <Bot size={20} className="text-gray-600" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-[var(--brand-color)] text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400">{t.aiThinking}</div>}
        <div ref={scrollRef} />
      </div>

      {plan && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700">{t.planGenerated}</span>
            <button
              onClick={handleAddPlan}
              className="ml-2 px-3 py-1 text-xs bg-[var(--brand-color)] text-white rounded hover:bg-[var(--brand-color-hover)]"
            >
              {t.oneClickAdd}
            </button>
          </div>
          <ul className="mt-2 text-xs text-black list-disc pl-5">
          {plan.tasksDaily?.map((task, i) => <li key={`d-${i}`}>{t.todayPlanPrefix}{task.title}</li>)}
          {plan.tasksFuture?.map((task, i) => <li key={`f-${i}`}>{t.futurePlanPrefix}{task.title}</li>)}
          </ul>
        </div>
      )}

      <div className="flex items-end gap-2 mt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.aiPlaceholder}
          className="w-full resize-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-orange-500 focus:border-orange-500 max-h-32 overflow-y-auto"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || loading}
          className="px-3 py-2 bg-[#d6c7b5] text-white rounded-lg hover:bg-[#d6c7b5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}