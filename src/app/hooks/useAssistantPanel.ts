"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type TopBarHandlers,
  useTopBar,
} from "../components/layout/TopBarContext";

type AssistantTopBarHandlers = Omit<Partial<TopBarHandlers>, "onToggleAIPanel">;

export function useAssistantPanel(topBarHandlers: AssistantTopBarHandlers) {
  const { setTopBarHandlers } = useTopBar();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setHasOpened(true);
    setIsOpen((current) => !current);
  }, []);

  useEffect(() => {
    setTopBarHandlers({
      ...topBarHandlers,
      onToggleAIPanel: toggle,
    });

    return () => {
      setTopBarHandlers({});
    };
  }, [setTopBarHandlers, toggle, topBarHandlers]);

  return {
    isOpen,
    hasOpened,
    shouldRender: hasOpened,
    close,
    toggle,
  };
}
