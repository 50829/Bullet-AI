import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type HighlightedSearchItemInput<
  T,
  Id extends string | number,
  GroupKey extends string | number,
> = {
  targetId: Id | null;
  items: T[];
  getItemId: (item: T) => Id;
  getElementId: (itemId: Id) => string;
  getGroupKey?: (item: T) => GroupKey;
  setCollapsedGroups?: Dispatch<SetStateAction<Set<GroupKey>>>;
};

export function useHighlightedSearchItem<
  T,
  Id extends string | number,
  GroupKey extends string | number = string,
>({
  targetId,
  items,
  getItemId,
  getElementId,
  getGroupKey,
  setCollapsedGroups,
}: HighlightedSearchItemInput<T, Id, GroupKey>) {
  const [activeHighlightId, setActiveHighlightId] = useState<Id | null>(null);

  useEffect(() => {
    if (targetId === null) return;
    const target = items.find((item) => getItemId(item) === targetId);
    if (!target) return;

    if (getGroupKey && setCollapsedGroups) {
      const groupKey = getGroupKey(target);
      setCollapsedGroups((current) => {
        if (!current.has(groupKey)) return current;
        const next = new Set(current);
        next.delete(groupKey);
        return next;
      });
    }
    setActiveHighlightId(targetId);

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(getElementId(targetId))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = window.setTimeout(() => {
      setActiveHighlightId((current) =>
        current === targetId ? null : current,
      );
    }, 1_000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [
    getElementId,
    getGroupKey,
    getItemId,
    items,
    setCollapsedGroups,
    targetId,
  ]);

  return activeHighlightId;
}
