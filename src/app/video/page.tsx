"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clapperboard, Loader2, Sparkles } from "lucide-react";

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

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <header className="border-b border-zinc-200 bg-white shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white shrink-0">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Video generation
              </h1>
              <p className="text-xs text-zinc-500">
                Create a short research explainer video
              </p>
            </div>
          </div>
          <Link
            href="/main"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 shrink-0"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <label className="block text-sm text-zinc-600">
            What should the video cover?
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="Describe your research topic, audience, or key points…"
              disabled={phase === "working"}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-rose-500/25 disabled:bg-zinc-50 disabled:text-zinc-500"
            />
          </label>
          <button
            type="button"
            onClick={() => void runGenerate()}
            disabled={phase === "working"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white text-sm font-medium hover:from-rose-700 hover:to-orange-700 disabled:opacity-60"
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
            <p className="text-sm text-emerald-700">Your video is ready.</p>
          )}
        </div>

        {phase === "ready" && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-950 overflow-hidden shadow-lg ring-1 ring-black/5">
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-end gap-2">
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
              className="w-full aspect-video bg-black object-contain"
              controls
              playsInline
              preload="auto"
            >
              <source src={VIDEO_SRC} type="video/mp4" />
              Your browser does not support embedded video.
            </video>
          </div>
        )}

        {phase === "working" && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 aspect-video flex flex-col items-center justify-center gap-3 text-zinc-500 text-sm">
            <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            <p>Rendering your video…</p>
            <p className="text-xs tabular-nums">{secondsLeft} seconds remaining</p>
          </div>
        )}
      </main>
    </div>
  );
}
