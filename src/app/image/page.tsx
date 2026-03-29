"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Image as ImageIcon,
  Loader2,
  Download,
} from "lucide-react";
import { MagicPanel } from "@/components/research-os/magic-panel";
import { ResearchOsSubpageShell } from "@/components/research-os/research-os-subpage-shell";
import { ACCENT_THEMES } from "@/components/research-os/research-os-theme";

const MAX_IMAGE_UPLOAD_BYTES = 50 * 1024 * 1024;

const ASPECT_OPTIONS = [
  { value: "16:9", label: "16:9 (slides)" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16 (mobile)" },
  { value: "21:9", label: "21:9 (wide)" },
] as const;

type GenerateResponse = {
  imageUrl?: string;
  imagePrompt?: string;
  plannerText?: string;
  textModel?: string;
  imageModel?: string;
  imageProvider?: "openrouter" | "static";
  truncated?: boolean;
  fileKind?: string;
  aspectRatio?: string;
  usedStaticFallback?: boolean;
  fallbackReason?: string;
  error?: string;
};

const PHASE_LABELS = [
  "Extracting text from your upload…",
  "Planning diagram description…",
  "Generating image (may take a minute)…",
];

export default function ProjectImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [loading, setLoading] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  useEffect(() => {
    if (!loading) return;
    setPhaseIdx(0);
    const t1 = window.setTimeout(() => setPhaseIdx(1), 2500);
    const t2 = window.setTimeout(() => setPhaseIdx(2), 9000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loading]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_IMAGE_UPLOAD_BYTES,
    accept: {
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
      "text/plain": [".txt"],
      "text/markdown": [".md", ".mdx"],
      "text/csv": [".csv"],
      "application/json": [".json"],
    },
  });

  const generate = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("aspectRatio", aspectRatio);
      const res = await fetch("/api/image/generate", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [file, aspectRatio]);

  const theme = ACCENT_THEMES.emerald;

  return (
    <ResearchOsSubpageShell
      accent="emerald"
      title="Project explainer image"
      subtitle="Turn a PDF, ZIP, or text export into one diagram-style image"
      icon={ImageIcon}
      headerClassName="mx-auto w-full max-w-3xl"
      mainClassName="mx-auto w-full max-w-3xl flex-1 px-4 py-8"
    >
      <main className="space-y-6">
        <MagicPanel
          gradient={theme.gradient}
          accent={theme.accentHex}
          innerClassName="p-0 overflow-hidden"
        >
          <div
            {...getRootProps()}
            className={`cursor-pointer p-8 text-center transition-colors ${
              isDragActive
                ? theme.dropzoneActive
                : `${theme.dropzoneIdle} border-2 border-dashed border-white/25`
            } rounded-[0.65rem]`}
          >
            <input {...getInputProps()} />
            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-200">
              Drop PDF, ZIP, .txt, .md, .csv, or .json
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Max {MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB
            </p>
            {file && (
              <p className="mt-3 max-w-full truncate px-2 text-xs font-medium text-emerald-400">
                {file.name}
              </p>
            )}
          </div>
        </MagicPanel>

        <MagicPanel
          gradient={theme.gradient}
          accent={theme.accentHex}
          innerClassName="p-4"
        >
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm text-zinc-400">
              <span className="mb-1 block">Aspect ratio</span>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
              >
                {ASPECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={!file || loading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/35 px-6 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${theme.primaryBtn}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                "Generate image"
              )}
            </button>
          </div>
        </MagicPanel>

        {loading && (
          <MagicPanel
            gradient={theme.gradient}
            accent={theme.accentHex}
            innerClassName="p-4"
          >
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-400" />
              <span>
                {PHASE_LABELS[phaseIdx] ?? PHASE_LABELS[PHASE_LABELS.length - 1]}
              </span>
            </div>
          </MagicPanel>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {result?.imageUrl && (
          <div className="space-y-4">
            <MagicPanel
              gradient={theme.gradient}
              accent={theme.accentHex}
              innerClassName="overflow-hidden p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.imageUrl}
                alt="Generated project diagram"
                className="h-auto w-full rounded-lg"
              />
            </MagicPanel>
            <a
              href={result.imageUrl}
              download={`project-diagram-${Date.now()}.png`}
              className={`inline-flex items-center gap-2 text-sm font-medium ${theme.subtleLink}`}
            >
              <Download className="h-4 w-4" />
              Download image
            </a>
          </div>
        )}
      </main>
    </ResearchOsSubpageShell>
  );
}
