"use client";

import { useEffect, useRef, useState } from "react";

const REVEAL_CLASS =
  "transition-[opacity,transform] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none";

export function getRevealClass(isVisible: boolean) {
  return `${REVEAL_CLASS} ${isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`;
}

export function useIntroReveal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return isVisible;
}

export function useScrollReveal<T extends HTMLElement>() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
