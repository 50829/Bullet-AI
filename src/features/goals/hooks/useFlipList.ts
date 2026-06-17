import { useCallback, useLayoutEffect, useRef } from "react";

type Pos = { top: number; left: number };

/**
 * 轻量 FLIP 动画：当列表顺序变化（orderKey 改变）时，让仍然存在的行
 * 从旧位置平滑滑动到新位置。无需第三方依赖。
 *
 * 用法：用返回的 register 为每个列表项的外层元素设置 ref，
 * 例如 <div ref={register(item.id)}>...</div>，并把当前顺序传入 orderKey。
 */
export function useFlipList<Id extends string | number>(orderKey: string) {
  const nodes = useRef(new Map<Id, HTMLElement>());
  const refCbs = useRef(new Map<Id, (el: HTMLElement | null) => void>());
  const prevPos = useRef(new Map<Id, Pos>());
  const prevKey = useRef<string | null>(null);

  const register = useCallback((id: Id) => {
    let cb = refCbs.current.get(id);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) nodes.current.set(id, el);
        else nodes.current.delete(id);
      };
      refCbs.current.set(id, cb);
    }
    return cb;
  }, []);

  useLayoutEffect(() => {
    const orderChanged = prevKey.current !== null && prevKey.current !== orderKey;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (orderChanged && !reduceMotion) {
      nodes.current.forEach((el, id) => {
        const prev = prevPos.current.get(id);
        if (!prev) return; // 新出现的行不做位移动画
        const dx = prev.left - el.offsetLeft;
        const dy = prev.top - el.offsetTop;
        if (dx === 0 && dy === 0) return;

        // Invert: 先把元素瞬移回旧位置
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.transitionProperty = "transform";
        el.style.transitionDuration = "0s";
        el.getBoundingClientRect(); // 强制回流，提交瞬移

        // Play: 下一帧过渡回原位
        requestAnimationFrame(() => {
          el.style.transform = "";
          el.style.transitionDuration = "340ms";
          el.style.transitionTimingFunction = "cubic-bezier(0.22, 1, 0.36, 1)";
        });
      });
    }

    const next = new Map<Id, Pos>();
    nodes.current.forEach((el, id) => {
      next.set(id, { top: el.offsetTop, left: el.offsetLeft });
    });
    prevPos.current = next;
    prevKey.current = orderKey;
  });

  return register;
}
