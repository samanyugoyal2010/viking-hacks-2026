"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  Image as ImageIcon,
  Loader2,
  Download,
} from "lucide-react";

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

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <header className="border-b border-zinc-200 bg-white shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Project explainer image
              </h1>
              <p className="text-xs text-zinc-500">
                Turn a PDF, ZIP, or text export into one diagram-style image
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

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        <div
          {...getRootProps()}
          className={`
            rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-emerald-400 bg-emerald-50" : "border-zinc-300 bg-white hover:border-emerald-300"}
          `}
        >
          <input {...getInputProps()} />
          <ImageIcon className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">
            Drop PDF, ZIP, .txt, .md, .csv, or .json
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Max {MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB
          </p>
          {file && (
            <p className="text-xs text-emerald-700 mt-3 font-medium truncate max-w-full px-2">
              {file.name}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
          <label className="flex-1 text-sm">
            <span className="block text-zinc-600 mb-1">Aspect ratio</span>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-white"
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
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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

        {loading && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 shrink-0" />
            <span>{PHASE_LABELS[phaseIdx] ?? PHASE_LABELS[PHASE_LABELS.length - 1]}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {result?.imageUrl && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.imageUrl}
                alt="Generated project diagram"
                className="w-full h-auto rounded-lg"
              />
            </div>
            <a
              href={result.imageUrl}
              download={`project-diagram-${Date.now()}.png`}
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download image
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
