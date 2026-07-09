import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type HighlightedSearchItemInput<T, K extends string | number> = {
  itemId?: number | null;
  queryParam?: string | null;
  items: T[];
  getItemId: (item: T) => number;
  getGroupKey?: (item: T) => K;
  setCollapsedGroups?: Dispatch<SetStateAction<Set<K>>>;
  getElementId: (itemId: number) => string;
};

export function useHighlightedSearchItem<T, K extends string | number>({
  itemId,
  queryParam,
  items,
  getItemId,
  getGroupKey,
  setCollapsedGroups,
  getElementId,
}: HighlightedSearchItemInput<T, K>) {
  const [activeHighlightId, setActiveHighlightId] = useState<number | null>(
    null,
  );
  const resolvedItemId = itemId ?? (queryParam ? Number(queryParam) : null);

  useEffect(() => {
    if (!resolvedItemId || !Number.isFinite(resolvedItemId)) return;

    const target = items.find((item) => getItemId(item) === resolvedItemId);
    if (!target) return;

    setActiveHighlightId(resolvedItemId);

    if (getGroupKey && setCollapsedGroups) {
      const groupKey = getGroupKey(target);
      setCollapsedGroups((current) => {
        if (!current.has(groupKey)) return current;
        const next = new Set(current);
        next.delete(groupKey);
        return next;
      });
    }

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(getElementId(resolvedItemId))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const highlightTimer = window.setTimeout(() => {
      setActiveHighlightId((current) =>
        current === resolvedItemId ? null : current,
      );
    }, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(highlightTimer);
    };
  }, [
    getElementId,
    getGroupKey,
    getItemId,
    resolvedItemId,
    items,
    setCollapsedGroups,
  ]);

  return activeHighlightId;
}
