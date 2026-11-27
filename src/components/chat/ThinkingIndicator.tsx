// src/components/chat/ThinkingIndicator.tsx
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { SparkleLogo } from "../ui/Icons";
import type { StreamPhase } from "../../types";
import { useTranslation } from "react-i18next";
import { formatDuration } from "../../lib/time";

export function ThinkingIndicator({ phase }: { phase: StreamPhase }) {
  const { t } = useTranslation();

  const iconRef = useRef<HTMLSpanElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = iconRef.current;
    if (!el) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ctx: gsap.Context | null = null;
    let timeline: gsap.core.Timeline | null = null;

    const stop = (): void => {
      timeline?.kill();
      timeline = null;
      ctx?.revert();
      ctx = null;
      gsap.set(el, { clearProps: "opacity,transform" });
    };

    const start = (): void => {
      stop();
      if (motionQuery.matches || document.hidden) return;

      ctx = gsap.context(() => {
        timeline = gsap
          .timeline({
            repeat: -1,
            yoyo: true,
            defaults: { ease: "sine.inOut" },
          })
          .fromTo(
            el,
            { opacity: 0.55, scale: 0.92, rotate: -4 },
            { opacity: 1, scale: 1.08, rotate: 4, duration: 0.85 },
          );
      }, el);
    };

    const onVisibilityChange = (): void => {
      if (document.hidden) stop();
      else start();
    };

    const onMotionChange = (): void => {
      start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
      stop();
    };
  }, []);

  const label =
    phase === "clarifying"
      ? t("chat.thinking.waiting")
      : phase === "retrieving"
        ? t("chat.thinking.searching")
        : t("chat.thinking.thinking");

  return (
    <div className="flex items-center gap-2 text-muted py-2">
      <span ref={iconRef} className="inline-flex">
        <SparkleLogo className="w-4 h-4 text-accent" animate={false} />
      </span>
      <span className="text-sm font-medium">
        {label}
        {elapsed > 0 && ` · ${formatDuration(elapsed, t)}`}…
      </span>
    </div>
  );
}
