"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { Drawer } from "./ui/Drawer";
import { Button } from "./ui/Button";

type AssistantMode = "chat" | "planning";

type PlanData = {
  daily: { title: string; description: string }[];
  future: { title: string; description: string }[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  planData?: PlanData | null;
};

type AssistantDrawerProps = {
  isOpen: boolean;
  title: string;
  systemPrompt: string;
  mode?: AssistantMode;
  placeholder?: string;
  onClose: () => void;
  onAddGoals?: (plan: PlanData) => Promise<void>;
};

export function AssistantDrawer({
  isOpen,
  title,
  systemPrompt,
  mode = "chat",
  placeholder,
  onClose,
  onAddGoals,
}: AssistantDrawerProps) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      planData: null,
    };

    const nextMessages = [...messages, userMessage];
    const messagesToSend = nextMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSend,
          language: language || "zh",
          systemPrompt,
          purpose: mode === "planning" ? "planning" : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply || t("aiError") || "抱歉，没有收到回复。",
          planData: mode === "planning" ? (data.plan ?? null) : null,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? `${language === "en" ? "Sorry, " : "抱歉，"}${error.message}`
              : t("aiError") || "抱歉，出了点问题，请稍后再试。",
          planData: null,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoals = async (plan: PlanData) => {
    if (!onAddGoals) return;
    setIsAdding(true);
    try {
      await onAddGoals(plan);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-add-error-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : t("addGoalsFailed") || "添加目标失败。",
          planData: null,
        },
      ]);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[84%] rounded-xl px-3 py-2 shadow-sm ${
                message.role === "user"
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                  : "border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-6">
                {message.content}
              </p>

              {message.planData && (
                <div className="mt-3 rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-3">
                  <p className="mb-2 text-sm font-semibold">
                    {language === "en" ? "Plan" : "计划"}
                  </p>
                  {(["daily", "future"] as const).map((group) => {
                    const tasks = message.planData?.[group] ?? [];
                    if (tasks.length === 0) return null;
                    return (
                      <div key={group} className="mb-3 last:mb-0">
                        <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)]">
                          {group === "daily"
                            ? t("todayTasks") || "今日任务"
                            : t("recentGoals") || "近期目标"}{" "}
                          ({tasks.length})
                        </p>
                        <ul className="space-y-1 text-xs">
                          {tasks.map((task, index) => (
                            <li key={`${group}-${index}`}>
                              <strong>{task.title}</strong>
                              {task.description ? `: ${task.description}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  <Button
                    className="mt-3 w-full"
                    disabled={isAdding}
                    onClick={() =>
                      message.planData && void handleAddGoals(message.planData)
                    }
                  >
                    {isAdding
                      ? t("adding") || "添加中..."
                      : t("addToMigrationList") || "加入待分配任务"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] px-3 py-3 shadow-sm">
              <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-4">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholder || t("aiInputPlaceholder") || "输入你的想法..."
            }
            disabled={isLoading}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-[var(--color-primary)] p-2.5 text-[var(--color-text-on-primary)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            aria-label={t("send") || "发送"}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </Drawer>
  );
}
