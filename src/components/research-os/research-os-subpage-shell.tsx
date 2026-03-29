"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PrismGradientBg } from "./prism-gradient-bg";
import { ACCENT_THEMES, type ResearchAccent } from "./research-os-theme";
import { cn } from "@/lib/utils";

type ResearchOsSubpageShellProps = {
  accent: ResearchAccent;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** Tailwind width classes for header inner row */
  headerClassName?: string;
  /** Applied to the flex-1 content wrapper below header */
  mainClassName?: string;
};

export function ResearchOsSubpageShell({
  accent,
  title,
  subtitle,
  icon: Icon,
  children,
  headerClassName = "max-w-[1600px] mx-auto w-full",
  mainClassName,
}: ResearchOsSubpageShellProps) {
  const t = ACCENT_THEMES[accent];

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#030303] text-zinc-100">
      <PrismGradientBg />
      <header className="relative z-10 shrink-0 border-b border-white/[0.08] bg-black/35 backdrop-blur-md">
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3",
            headerClassName
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-white/5 text-white",
                t.iconBorder,
                t.iconGlow
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-white">
                {title}
              </h1>
              <p className="text-xs text-zinc-400">{subtitle}</p>
            </div>
          </div>
          <Link
            href="/main"
            className="shrink-0 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            ← ResearchOS
          </Link>
        </div>
      </header>
      <div
        className={cn("relative z-10 flex min-h-0 flex-1 flex-col", mainClassName)}
      >
        {children}
      </div>
    </div>
  );
}
