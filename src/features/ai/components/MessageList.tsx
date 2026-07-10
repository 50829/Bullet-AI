"use client";

import type { GoalPlan } from "@/lib/ai/goalPlan";
import type { AssistantMessage } from "../chat/types";
import { PlanPreview } from "./PlanPreview";

type MessageListProps = {
  messages: AssistantMessage[];
  loading: boolean;
  adding: boolean;
  onAddGoals: (plan: GoalPlan) => void | Promise<void>;
};

export function MessageList({
  messages,
  loading,
  adding,
  onAddGoals,
}: MessageListProps) {
  return (
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
              <PlanPreview
                plan={message.planData}
                adding={adding}
                onAdd={onAddGoals}
              />
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] px-3 py-3 shadow-sm">
            <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
          </div>
        </div>
      )}
    </div>
  );
}
