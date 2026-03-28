"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  FileText,
  FolderArchive,
  Image as ImageIcon,
  Clapperboard,
  ArrowRight,
} from "lucide-react";
import { gsap } from "gsap";
import { ParticleField } from "@/components/particle-field";
import { AUTO_SCROLL_CARDS_KEY } from "@/lib/welcome-storage";

const tools = [
  {
    href: "/side-by-side",
    title: "Side-by-side PDF chat",
    description:
      "Upload a PDF, highlight passages, capture page screenshots, and chat with an assistant that reads your document.",
    icon: FileText,
    cta: "Open workspace",
    accent: "text-sky-600",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    href: "/explain-research",
    title: "Explain Research",
    description:
      "Upload a ZIP export and explore what's inside with a guided assistant.",
    icon: FolderArchive,
    cta: "Explore archive",
    accent: "text-violet-600",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    href: "/image",
    title: "Project explainer image",
    description:
      "Upload a PDF, ZIP, or text file and generate one diagram-style image that summarizes the whole project.",
    icon: ImageIcon,
    cta: "Generate visual",
    accent: "text-emerald-600",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    href: "/video",
    title: "Video generation",
    description:
      "Turn research notes into a short explainer-style video from your brief.",
    icon: Clapperboard,
    cta: "Start video",
    accent: "text-rose-600",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
] as const;

export function ResearchOS() {
  const duckWrapRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const wrap = duckWrapRef.current;
    if (!wrap) return;

    let shouldScroll = false;
    try {
      shouldScroll = sessionStorage.getItem(AUTO_SCROLL_CARDS_KEY) === "1";
      if (shouldScroll) {
        sessionStorage.removeItem(AUTO_SCROLL_CARDS_KEY);
      }
    } catch {
      /* ignore */
    }

    gsap.fromTo(
      wrap,
      { y: -120, opacity: 0, scale: 0.88 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.45,
        ease: "power3.out",
        onComplete: () => {
          if (!shouldScroll || !cardsRef.current) return;
          requestAnimationFrame(() => {
            cardsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        },
      }
    );
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white">
      <ParticleField />

      <div className="relative z-10">
        <header className="border-b border-white/10 px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Image
              src="/mascot-light.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-auto object-contain"
            />
            <span className="text-lg font-semibold tracking-tight sm:text-xl">
              ResearchOS
            </span>
          </div>
        </header>

        <section className="flex min-h-[78vh] flex-col items-center justify-center px-6 pt-4 pb-16 sm:min-h-[80vh]">
          <div
            ref={duckWrapRef}
            className="will-change-transform"
            style={{ opacity: 0 }}
          >
            <Image
              src="/mascot-light.png"
              alt="Magical duck"
              width={200}
              height={200}
              className="h-auto w-40 bg-transparent object-contain sm:w-48"
              priority
            />
          </div>
          <p className="text-white/40 mt-8 max-w-sm text-center text-xs">
            Your tools are below—auto-scroll runs once after this entrance.
          </p>
        </section>

        <section
          id="research-os-cards"
          ref={cardsRef}
          className="mx-auto max-w-5xl scroll-mt-6 px-6 pb-28 pt-4"
        >
          <div className="mb-10">
            <p className="text-brand-spark text-xs font-medium tracking-[0.2em] uppercase">
              Capabilities
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Choose how you want to work
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group block rounded-2xl bg-white p-6 text-zinc-900 shadow-lg shadow-black/40 ring-1 ring-black/5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tool.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${tool.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {tool.title}
                  </h3>
                  <p className="text-zinc-600 mt-2 text-sm leading-relaxed">
                    {tool.description}
                  </p>
                  <span
                    className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${tool.accent}`}
                  >
                    {tool.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
