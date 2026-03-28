"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SpiralAnimation } from "@/components/ui/spiral-animation";
import {
  AUTO_SCROLL_CARDS_KEY,
  WELCOME_SEEN_KEY,
} from "@/lib/welcome-storage";

/** One full spiral cycle in AnimationController (time 0→1, duration 15s) */
const SPIRAL_CYCLE_MS = 15_000;

export function WelcomeScreen() {
  const router = useRouter();
  const [ctaVisible, setCtaVisible] = useState(false);
  const navigatingRef = useRef(false);
  const skipWelcomeChecked = useRef(false);

  const goToResearchOS = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      sessionStorage.setItem(WELCOME_SEEN_KEY, "1");
      sessionStorage.setItem(AUTO_SCROLL_CARDS_KEY, "1");
    } catch {
      /* continue */
    }
    router.replace("/main");
  }, [router]);

  useLayoutEffect(() => {
    if (skipWelcomeChecked.current) return;
    skipWelcomeChecked.current = true;
    try {
      if (sessionStorage.getItem(WELCOME_SEEN_KEY)) {
        router.replace("/main");
      }
    } catch {
      /* sessionStorage unavailable */
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only skip
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setCtaVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      goToResearchOS();
    }, SPIRAL_CYCLE_MS);
    return () => clearTimeout(t);
  }, [goToResearchOS]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div className="absolute inset-0">
        <SpiralAnimation />
      </div>

      <div
        className="pointer-events-none fixed left-1/2 top-4 z-[60] -translate-x-1/2 select-none sm:top-6"
        aria-hidden
      >
        <Image
          src="/mascot-light.png"
          alt=""
          width={96}
          height={96}
          className="h-14 w-auto object-contain sm:h-16"
          priority
        />
      </div>

      <div
        className={`absolute left-1/2 top-1/2 z-10 flex w-full max-w-[min(96vw,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center px-4 text-center transition-all duration-1500 ease-out ${
          ctaVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={goToResearchOS}
          className="cursor-pointer text-[clamp(3.5rem,14vw,11rem)] font-extralight leading-none uppercase tracking-[0.08em] text-white transition-all duration-700 animate-pulse hover:tracking-[0.14em]"
        >
          Welcome
        </button>
        <p className="text-white/45 mt-8 max-w-xl text-center text-sm tracking-wide sm:text-base">
          Or wait—ResearchOS opens automatically when the spiral completes.
        </p>
      </div>
    </div>
  );
}
