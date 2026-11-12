import { useEffect, useRef } from "react";

export function useStickToBottom(
  ref: React.RefObject<HTMLElement | null>,
  deps: any[] = [],
) {
  const isSticky = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 80;
      isSticky.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (el && isSticky.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, deps);
}
