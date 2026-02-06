import { useEffect, useRef, type DependencyList } from "react";

export const useDebouncedEffect = (
  effect: () => void,
  deps: DependencyList,
  delay = 600
) => {
  const timeoutRef = useRef<number>();

  useEffect(() => {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      effect();
    }, delay);

    return () => window.clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
