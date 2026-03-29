"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clapperboard, Loader2, Sparkles } from "lucide-react";
import { MagicPanel } from "@/components/research-os/magic-panel";
import { ResearchOsSubpageShell } from "@/components/research-os/research-os-subpage-shell";
import { ACCENT_THEMES } from "@/components/research-os/research-os-theme";

const VIDEO_SRC = "/editor-export.mp4";
const GENERATE_SECONDS = 30;

export default function VideoGenerationPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "ready">("idle");
  const [secondsLeft, setSecondsLeft] = useState(GENERATE_SECONDS);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    const el = videoRef.current;
    if (el) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    }
  }, [phase]);

  const runGenerate = useCallback(() => {
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    setPhase("working");
    setSecondsLeft(GENERATE_SECONDS);
    let remaining = GENERATE_SECONDS;
    const id = window.setInterval(() => {
      remaining -= 1;
      setSecondsLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        window.clearInterval(id);
        intervalRef.current = null;
        setPhase("ready");
      }
    }, 1000);
    intervalRef.current = id;
  }, []);

  const theme = ACCENT_THEMES.rose;

  return (
    <ResearchOsSubpageShell
      accent="rose"
      title="Video generation"
      subtitle="Create a short research explainer video"
      icon={Clapperboard}
      headerClassName="mx-auto w-full max-w-4xl"
      mainClassName="mx-auto w-full max-w-4xl flex-1 px-4 py-8"
    >
      <main className="space-y-8">
        <MagicPanel
          gradient={theme.gradient}
          accent={theme.accentHex}
          innerClassName="space-y-4 p-6"
        >
          <label className="block text-sm text-zinc-400">
            What should the video cover?
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="Describe your research topic, audience, or key points…"
              disabled={phase === "working"}
              className={`mt-1.5 w-full resize-y rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 disabled:opacity-60 ${theme.focusRing}`}
            />
          </label>
          <button
            type="button"
            onClick={() => void runGenerate()}
            disabled={phase === "working"}
            className={`inline-flex items-center gap-2 rounded-xl border border-rose-400/35 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${theme.primaryBtn}`}
          >
            {phase === "working" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating video… {secondsLeft}s
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate video
              </>
            )}
          </button>
          {phase === "ready" && (
            <p className="text-sm text-emerald-400">Your video is ready.</p>
          )}
        </MagicPanel>

        {phase === "ready" && (
          <MagicPanel
            gradient={theme.gradient}
            accent={theme.accentHex}
            innerClassName="overflow-hidden p-0"
          >
            <div className="flex items-center justify-end gap-2 border-b border-white/10 px-4 py-2">
              <a
                href={VIDEO_SRC}
                download="research-explainer.mp4"
                className="text-xs font-medium text-rose-400 hover:text-rose-300"
              >
                Download
              </a>
            </div>
            <video
              ref={videoRef}
              className="aspect-video w-full bg-black object-contain"
              controls
              playsInline
              preload="auto"
            >
              <source src={VIDEO_SRC} type="video/mp4" />
              Your browser does not support embedded video.
            </video>
          </MagicPanel>
        )}

        {phase === "working" && (
          <MagicPanel
            gradient={theme.gradient}
            accent={theme.accentHex}
            innerClassName="p-0 overflow-hidden"
          >
            <div className="flex aspect-video flex-col items-center justify-center gap-3 border-2 border-dashed border-white/20 bg-black/35 p-6 text-sm text-zinc-400">
              <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
              <p>Rendering your video…</p>
              <p className="tabular-nums text-xs text-zinc-500">
                {secondsLeft} seconds remaining
              </p>
            </div>
          </MagicPanel>
        )}
      </main>
    </ResearchOsSubpageShell>
  );
}
