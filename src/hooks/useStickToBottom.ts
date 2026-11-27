import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Lenis from "lenis";

const BOTTOM_THRESHOLD_PX = 80;

function detectCoarseTouch(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onChange);
    }
    return () => {
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", onChange);
      } else if (typeof mq.removeListener === "function") {
        mq.removeListener(onChange);
      }
    };
  }, []);

  return reduced;
}

export interface StickToBottomOptions {
  /** Identitas pesan pertama; berubah saat sesi berganti atau prepend. */
  firstId?: string | null;
}

interface ScrollSnapshot {
  firstId: string | null;
  scroll: number;
  limit: number;
}

export function useStickToBottom(
  wrapperRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLElement | null>,
  deps: unknown[] = [],
  options: StickToBottomOptions = {},
): { useNative: boolean } {
  const prefersReduced = usePrefersReducedMotion();
  const [coarse] = useState<boolean>(() => detectCoarseTouch());
  const useNative = prefersReduced || coarse;

  const stickyRef = useRef(true);
  const lenisRef = useRef<Lenis | null>(null);
  const prevRef = useRef<ScrollSnapshot>({
    firstId: options.firstId ?? null,
    scroll: 0,
    limit: 0,
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    stickyRef.current = true;
    prevRef.current = {
      firstId: options.firstId ?? null,
      scroll: 0,
      limit: 0,
    };

    if (useNative) {
      const onScroll = () => {
        const dist =
          wrapper.scrollHeight - wrapper.scrollTop - wrapper.clientHeight;
        stickyRef.current = dist < BOTTOM_THRESHOLD_PX;
      };
      wrapper.addEventListener("scroll", onScroll, { passive: true });

      const ro = new ResizeObserver(() => {
        if (stickyRef.current) {
          wrapper.scrollTop = wrapper.scrollHeight;
        }
      });
      ro.observe(content);

      wrapper.scrollTop = wrapper.scrollHeight;

      return () => {
        wrapper.removeEventListener("scroll", onScroll);
        ro.disconnect();
      };
    }

    const lenis = new Lenis({
      wrapper,
      content,
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
      stickyRef.current = limit - scroll < BOTTOM_THRESHOLD_PX;
    };
    lenis.on("scroll", onScroll);

    const ro = new ResizeObserver(() => {
      lenis.resize();
      if (stickyRef.current) {
        lenis.scrollTo(lenis.limit, { immediate: true, force: true });
      }
    });
    ro.observe(content);

    lenis.resize();
    lenis.scrollTo(lenis.limit, { immediate: true, force: true });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      lenis.destroy();
      lenisRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapperRef, contentRef, useNative]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const newFirstId = options.firstId ?? null;
    const prev = prevRef.current;
    const prepended =
      prev.firstId !== null &&
      newFirstId !== null &&
      prev.firstId !== newFirstId;

    if (useNative) {
      const newLimit = wrapper.scrollHeight - wrapper.clientHeight;
      const currentScroll = wrapper.scrollTop;

      if (prepended && !stickyRef.current) {
        const delta = newLimit - prev.limit;
        if (delta > 0) {
          wrapper.scrollTop = currentScroll + delta;
        }
      } else if (stickyRef.current) {
        wrapper.scrollTop = newLimit;
      }

      prevRef.current = {
        firstId: newFirstId,
        scroll: wrapper.scrollTop,
        limit: newLimit,
      };
      return;
    }

    const lenis = lenisRef.current;
    if (!lenis) return;

    lenis.resize();
    const newLimit = lenis.limit;
    const currentScroll = lenis.scroll;

    if (prepended && !stickyRef.current) {
      const delta = newLimit - prev.limit;
      if (delta > 0) {
        lenis.scrollTo(currentScroll + delta, {
          immediate: true,
          force: true,
        });
      }
    } else if (stickyRef.current) {
      lenis.scrollTo(newLimit, { immediate: true, force: true });
    }

    prevRef.current = {
      firstId: newFirstId,
      scroll: lenis.scroll,
      limit: lenis.limit,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { useNative };
}
