"use client";

import { useState } from "react";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import {
  GOAL_PLANNING_PURPOSE,
  parseGoalPlanningResponse,
  type GoalPlan,
} from "@/lib/ai/goalPlan";
import type { AssistantMessage } from "./types";

type UseAssistantChatInput = {
  onAddGoals: (plan: GoalPlan) => Promise<void>;
};

export function useAssistantChat({ onAddGoals }: UseAssistantChatInput) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AssistantMessage = {
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
          purpose: GOAL_PLANNING_PURPOSE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const data = parseGoalPlanningResponse(await response.json());
      if (!data) {
        throw new Error(
          language === "en"
            ? "The planning service returned an invalid response."
            : "规划服务返回了无效响应。",
        );
      }
      const assistantContent = data.reply.trim()
        ? data.reply
        : language === "en"
          ? "Here is your plan."
          : "已为你生成计划。";
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantContent,
          planData: data.plan ?? null,
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

  const addGoals = async (plan: GoalPlan) => {
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
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    isAdding,
    sendMessage,
    addGoals,
  };
}
