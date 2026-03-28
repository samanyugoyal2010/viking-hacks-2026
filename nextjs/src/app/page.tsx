"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Brain,
  Palette,
  Image as ImageIcon,
  MessageSquare,
  Zap,
} from "lucide-react";

interface PipelineResult {
  paperTitle: string;
  paperDomain: string;
  suggestedCaption: string;
  keyComponents: string[];
  methodologyText: string;
  plannerDescription: string;
  stylistDescription: string;
  imageBase64: string | null;
  criticSuggestions: string | null;
  criticRevisedDescription: string | null;
  finalImageBase64: string | null;
}

const PIPELINE_STEPS = [
  { key: "extract", label: "Analyzing PDF", icon: FileText, color: "text-blue-500" },
  { key: "planner", label: "Planning Diagram", icon: Brain, color: "text-violet-500" },
  { key: "stylist", label: "Styling Design", icon: Palette, color: "text-pink-500" },
  { key: "visualizer", label: "Generating Image", icon: ImageIcon, color: "text-emerald-500" },
  { key: "critic", label: "Reviewing Quality", icon: MessageSquare, color: "text-amber-500" },
];

function detectStep(msg: string): string {
  if (msg.includes("Analyzing PDF")) return "extract";
  if (msg.includes("Planner")) return "planner";
  if (msg.includes("Stylist")) return "stylist";
  if (msg.includes("Visualizer") || msg.includes("Generating diagram")) return "visualizer";
  if (msg.includes("Critic") || msg.includes("Review")) return "critic";
  if (msg.includes("Re-generating")) return "visualizer";
  return "";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [criticRounds, setCriticRounds] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeStepKey, setActiveStepKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 30 * 1024 * 1024,
  });

  const handleGenerate = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep("Uploading PDF...");
    setCompletedSteps([]);
    setActiveStepKey("extract");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: base64,
          caption: caption || undefined,
          aspectRatio,
          criticRounds,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Server error");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "step") {
              const stepMsg = event.data as string;
              setCurrentStep(stepMsg);

              const detected = detectStep(stepMsg);
              if (detected) {
                setActiveStepKey((prev) => {
                  if (prev && prev !== detected) {
                    setCompletedSteps((cs) =>
                      cs.includes(prev) ? cs : [...cs, prev]
                    );
                  }
                  return detected;
                });
              }
            } else if (event.type === "result") {
              setCompletedSteps((cs) => {
                const all = PIPELINE_STEPS.map((s) => s.key);
                return [...new Set([...cs, ...all])];
              });
              setActiveStepKey("");
              setResult(event.data as PipelineResult);
            } else if (event.type === "error") {
              throw new Error(
                (event.data as { message: string }).message
              );
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              throw e;
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const downloadImage = () => {
    if (!result?.finalImageBase64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${result.finalImageBase64}`;
    link.download = `${result.paperTitle?.replace(/\s+/g, "_") || "diagram"}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-lg shrink-0">
              🍌
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                PaperBanana
              </h1>
              <p className="text-xs text-zinc-500">
                Research paper to publication-quality diagram
              </p>
            </div>
          </div>
          <a
            href={`${(process.env.NEXT_PUBLIC_SIDE_BY_SIDE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "")}/main`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 shrink-0"
          >
            Side-by-side PDF chat →
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel — Upload & Config */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload */}
            <div
              {...getRootProps()}
              className={`
                relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive
                  ? "border-amber-400 bg-amber-50"
                  : file
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-zinc-300 bg-white hover:border-amber-300 hover:bg-amber-50/30"
                }
              `}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="space-y-2">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-zinc-800 truncate max-w-[250px] mx-auto">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {(file.size / 1024 / 1024).toFixed(1)} MB — click or drop to
                    replace
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-12 w-12 rounded-full bg-zinc-100 mx-auto flex items-center justify-center">
                    <Upload className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-600">
                    Drop a research paper PDF
                  </p>
                  <p className="text-xs text-zinc-400">or click to browse (max 30 MB)</p>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Figure Caption{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder='e.g. "Figure 1: Overview of our proposed multi-agent framework"'
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent resize-none"
                rows={3}
              />
              <p className="text-xs text-zinc-400">
                Leave blank to auto-generate from the paper content.
              </p>
            </div>

            {/* Advanced Options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">
                    Aspect Ratio
                  </label>
                  <div className="flex gap-2">
                    {["16:9", "1:1", "4:3", "3:2"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          aspectRatio === r
                            ? "bg-zinc-900 text-white"
                            : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">
                    Critic Rounds:{" "}
                    <span className="text-amber-600">{criticRounds}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    value={criticRounds}
                    onChange={(e) => setCriticRounds(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <p className="text-xs text-zinc-400">
                    More rounds = higher quality but slower (0 = no critic).
                  </p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!file || loading}
              className={`
                w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold
                transition-all duration-200
                ${
                  !file || loading
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-200/50 hover:shadow-amber-300/50 hover:scale-[1.01] active:scale-[0.99]"
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Diagram
                </>
              )}
            </button>

            {/* Pipeline Progress */}
            {loading && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-zinc-700">
                    Pipeline Progress
                  </span>
                </div>
                {PIPELINE_STEPS.map((step) => {
                  const isActive = activeStepKey === step.key;
                  const isComplete = completedSteps.includes(step.key);
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                          isComplete
                            ? "bg-emerald-100"
                            : isActive
                              ? "bg-amber-100 animate-pulse-ring"
                              : "bg-zinc-100"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                        ) : (
                          <Icon className={`h-3.5 w-3.5 text-zinc-400`} />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isComplete
                            ? "text-emerald-700 font-medium"
                            : isActive
                              ? "text-amber-700 font-medium"
                              : "text-zinc-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
                <p className="text-xs text-zinc-400 pt-1 border-t border-zinc-100">
                  {currentStep}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Generation Failed
                  </p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel — Results */}
          <div className="lg:col-span-3 space-y-6">
            {!result && !loading && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-zinc-100 mx-auto flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-zinc-300" />
                </div>
                <p className="text-zinc-400 text-sm">
                  Upload a paper and click Generate to see your diagram here.
                </p>
              </div>
            )}

            {loading && !result && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <div className="relative h-20 w-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 opacity-20 animate-pulse-ring" />
                  <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                  </div>
                </div>
                <p className="text-sm font-medium text-zinc-600">
                  {currentStep}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  This usually takes 1-3 minutes
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Paper Info */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {result.paperTitle}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    {result.suggestedCaption}
                  </p>
                  {result.keyComponents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {result.keyComponents.map((comp, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generated Diagram */}
                {result.finalImageBase64 && (
                  <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-700">
                        Generated Diagram
                      </h3>
                      <button
                        onClick={downloadImage}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-medium hover:bg-zinc-200 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download PNG
                      </button>
                    </div>
                    <div className="p-4 bg-zinc-50">
                      <img
                        src={`data:image/png;base64,${result.finalImageBase64}`}
                        alt="Generated diagram"
                        className="w-full rounded-lg shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {!result.finalImageBase64 && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-700">
                      Image generation failed. The descriptions below were
                      generated successfully — try again or adjust settings.
                    </p>
                  </div>
                )}

                {/* Reasoning Sections */}
                <div className="space-y-3">
                  <CollapsibleSection
                    title="Planner Agent Reasoning"
                    icon={<Brain className="h-4 w-4 text-violet-500" />}
                    content={result.plannerDescription}
                    expanded={expandedSections["planner"]}
                    onToggle={() => toggleSection("planner")}
                  />
                  <CollapsibleSection
                    title="Stylist Agent Output"
                    icon={<Palette className="h-4 w-4 text-pink-500" />}
                    content={result.stylistDescription}
                    expanded={expandedSections["stylist"]}
                    onToggle={() => toggleSection("stylist")}
                  />
                  {result.criticSuggestions && (
                    <CollapsibleSection
                      title="Critic Feedback"
                      icon={
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                      }
                      content={result.criticSuggestions}
                      expanded={expandedSections["critic"]}
                      onToggle={() => toggleSection("critic")}
                    />
                  )}
                  {result.criticRevisedDescription &&
                    result.criticRevisedDescription !== "No changes needed." && (
                      <CollapsibleSection
                        title="Critic Revised Description"
                        icon={
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        }
                        content={result.criticRevisedDescription}
                        expanded={expandedSections["revised"]}
                        onToggle={() => toggleSection("revised")}
                      />
                    )}
                  <CollapsibleSection
                    title="Extracted Methodology"
                    icon={<FileText className="h-4 w-4 text-blue-500" />}
                    content={result.methodologyText}
                    expanded={expandedSections["method"]}
                    onToggle={() => toggleSection("method")}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-4">
        <p className="text-center text-xs text-zinc-400">
          Built with PaperBanana pipeline &middot; Powered by OpenRouter
        </p>
      </footer>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  content,
  expanded,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
  expanded?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-zinc-700">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-100">
          <pre className="text-xs text-zinc-600 whitespace-pre-wrap mt-3 leading-relaxed max-h-80 overflow-y-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
