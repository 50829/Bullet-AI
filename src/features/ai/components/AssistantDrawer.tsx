"use client";

import { ChatComposer } from "./ChatComposer";
import { MessageList } from "./MessageList";
import type { AssistantMode, PlanData } from "../chat/types";
import { useAssistantChat } from "../chat/useAssistantChat";
import { Drawer } from "../../../shared/components/ui/Drawer";
import type { AiPurpose } from "../../../lib/ai/promptRegistry";

type AssistantDrawerProps = {
  isOpen: boolean;
  title: string;
  purpose?: AiPurpose;
  mode?: AssistantMode;
  placeholder?: string;
  onClose: () => void;
  onAddGoals?: (plan: PlanData) => Promise<void>;
};

export function AssistantDrawer({
  isOpen,
  title,
  purpose = "moment_chat",
  mode = "chat",
  placeholder,
  onClose,
  onAddGoals,
}: AssistantDrawerProps) {
  const assistant = useAssistantChat({ purpose, mode, onAddGoals });

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
