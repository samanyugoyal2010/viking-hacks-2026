"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Clapperboard, Loader2, Play, Sparkles } from "lucide-react";

const VIDEO_SRC = "/editor-export.mp4";

export default function VideoGenerationPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "ready">("idle");

  const runPreview = useCallback(() => {
    setPhase("working");
    window.setTimeout(() => {
      setPhase("ready");
      const el = videoRef.current;
      if (el) {
        el.currentTime = 0;
        void el.play().catch(() => {});
      }
    }, 1200);
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
                Research explainer video — template preview
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
            Optional brief (for demo flow)
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="e.g. Summarize our Viking Hacks research workflow…"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-rose-500/25"
            />
          </label>
          <button
            type="button"
            onClick={() => void runPreview()}
            disabled={phase === "working"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white text-sm font-medium hover:from-rose-700 hover:to-orange-700 disabled:opacity-60"
          >
            {phase === "working" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing preview…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate preview
              </>
            )}
          </button>
          {phase === "ready" && (
            <p className="text-sm text-emerald-700 flex items-center gap-2">
              <Play className="h-4 w-4 shrink-0" />
              Preview ready — template playback below.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-950 overflow-hidden shadow-lg ring-1 ring-black/5">
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase">
              Stock template
            </span>
            <a
              href={VIDEO_SRC}
              download="research-explainer-template.mp4"
              className="text-xs font-medium text-rose-400 hover:text-rose-300"
            >
              Download MP4
            </a>
          </div>
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black object-contain"
            controls
            playsInline
            preload="metadata"
          >
            <source src={VIDEO_SRC} type="video/mp4" />
            Your browser does not support embedded video.
          </video>
        </div>
      </main>
    </div>
  );
}
