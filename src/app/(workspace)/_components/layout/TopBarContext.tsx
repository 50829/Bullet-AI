"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type TopBarHandlers = {
  onAddMoment?: () => void;
  onAddGoal?: () => void;
  onAddReflection?: () => void;
  onToggleAIPanel?: () => void;
};

export type TopBarContextType = TopBarHandlers & {
  setTopBarHandlers: (handlers: TopBarHandlers) => void;
};

export const TopBarContext = createContext<TopBarContextType | null>(null);

export const useTopBar = () => {
  const context = useContext(TopBarContext);
  if (!context) {
    throw new Error("useTopBar must be used within TopBarProvider");
  }
  return context;
};

export const TopBarProvider = ({ children }: { children: React.ReactNode }) => {
  const [handlers, setHandlers] = useState<TopBarHandlers>({});

  const setTopBarHandlers = useCallback((newHandlers: TopBarHandlers) => {
    setHandlers(newHandlers);
  }, []);

  const value: TopBarContextType = useMemo(
    () => ({
      ...handlers,
      setTopBarHandlers,
    }),
    [handlers, setTopBarHandlers],
  );

  return (
    <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>
  );
};
