import { useCallback, useState } from "react";

export type DeleteConfirmTarget = {
  id: number;
  name: string;
  type?: string;
  imagePath?: string | null;
};

export function useDeleteConfirm<T extends DeleteConfirmTarget>() {
  const [target, setTarget] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const open = useCallback((nextTarget: T) => {
    setTarget(nextTarget);
  }, []);

  const cancel = useCallback(() => {
    if (!loading) setTarget(null);
  }, [loading]);

  const confirm = useCallback(
    async (handler: (target: T) => Promise<void>) => {
      if (!target) return;
      setLoading(true);
      try {
        await handler(target);
        setTarget(null);
      } finally {
        setLoading(false);
      }
    },
    [target],
  );

  return {
    target,
    loading,
    isOpen: Boolean(target),
    open,
    cancel,
    confirm,
  };
}
