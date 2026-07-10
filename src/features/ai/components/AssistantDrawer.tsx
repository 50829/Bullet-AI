"use client";

import { ChatComposer } from "./ChatComposer";
import { MessageList } from "./MessageList";
import { useAssistantChat } from "../chat/useAssistantChat";
import { Drawer } from "@/shared/components/ui/Drawer";
import type { GoalPlan } from "@/lib/ai/goalPlan";

type AssistantDrawerProps = {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  onClose: () => void;
  onAddGoals: (plan: GoalPlan) => Promise<void>;
};

export function AssistantDrawer({
  isOpen,
  title,
  placeholder,
  onClose,
  onAddGoals,
}: AssistantDrawerProps) {
  const assistant = useAssistantChat({ onAddGoals });

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title}>
      <MessageList
        messages={assistant.messages}
        loading={assistant.isLoading}
        adding={assistant.isAdding}
        onAddGoals={assistant.addGoals}
      />
      <ChatComposer
        value={assistant.input}
        placeholder={placeholder}
        loading={assistant.isLoading}
        onChange={assistant.setInput}
        onSend={assistant.sendMessage}
      />
    </Drawer>
  );
}
