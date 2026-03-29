"use client";

import {
  FileText,
  FolderArchive,
  Image as ImageIcon,
  Clapperboard,
  Sparkles,
} from "lucide-react";
import { useCallback, useState } from "react";
import { MagicToolCard } from "@/components/research-os/magic-tool-card";
import { PrismGradientBg } from "@/components/research-os/prism-gradient-bg";
import { ResearchOsLoadingScreen } from "@/components/research-os/research-os-loading-screen";

const tools = [
  {
    href: "/side-by-side",
    title: "Side-by-side PDF chat",
    description:
      "Upload a PDF, highlight passages, capture screenshots, and chat with an assistant that reads your document.",
    icon: FileText,
    gradient: "linear-gradient(to left, #38bdf8 0%, #06b6d4 100%)",
    accent: "#38bdf8",
  },
  {
    href: "/explain-research",
    title: "Explain Research",
    description:
      "Upload a ZIP export and explore what's inside with a guided assistant.",
    icon: FolderArchive,
    gradient: "linear-gradient(to left, #c084fc 0%, #e879f9 100%)",
    accent: "#d8b4fe",
  },
  {
    href: "/project-explainer-image",
    title: "Project explainer image",
    description:
      "Upload a PDF, ZIP, or text file and generate one diagram-style summary image.",
    icon: ImageIcon,
    gradient: "linear-gradient(to left, #34d399 0%, #14b8a6 100%)",
    accent: "#6ee7b7",
  },
  {
    href: "/video-generation",
    title: "Video generation",
    description:
      "Turn research notes into a short explainer-style video from your brief.",
    icon: Clapperboard,
    gradient: "linear-gradient(to left, #fb7185 0%, #fb923c 100%)",
    accent: "#fda4af",
  },
] as const;

export function MainHub() {
  const [showLoader, setShowLoader] = useState(true);

  const handleLoadComplete = useCallback(() => {
    setShowLoader(false);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden text-zinc-100">
      <PrismGradientBg />

      {showLoader && (
        <ResearchOsLoadingScreen onComplete={handleLoadComplete} />
      )}

      <header className="relative z-10 border-b border-white/[0.08] bg-black/25 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_0_40px_-8px_rgba(99,102,241,0.55)]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Research<span className="text-white/90">OS</span>
            </h1>
            <p className="text-sm text-zinc-400">
              One workspace for research, documents, and explainers
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => (
            <MagicToolCard
              key={tool.href}
              href={tool.href}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              gradient={tool.gradient}
              accent={tool.accent}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
