"use client";

import { useState } from "react";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import type { AiPurpose } from "../../../lib/ai/promptRegistry";
import type { AssistantMessage, AssistantMode, PlanData } from "./types";

type UseAssistantChatInput = {
  purpose: AiPurpose;
  mode: AssistantMode;
  onAddGoals?: (plan: PlanData) => Promise<void>;
};

export function useAssistantChat({
  purpose,
  mode,
  onAddGoals,
}: UseAssistantChatInput) {
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
          purpose: mode === "planning" ? "goal_planning" : purpose,
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

  const addGoals = async (plan: PlanData) => {
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
