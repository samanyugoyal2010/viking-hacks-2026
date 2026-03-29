"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  FolderArchive,
  Loader2,
  Send,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { unzipToTextCorpus } from "@/lib/zip-extract";
import {
  loadExplainProject,
  saveExplainProject,
  clearExplainProject,
  type ExplainResearchMeta,
  type ExplainChatMessage,
} from "@/lib/explain-research-db";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";
import { MagicPanel } from "@/components/research-os/magic-panel";
import { PrismGradientBg } from "@/components/research-os/prism-gradient-bg";
import { ResearchOsSubpageShell } from "@/components/research-os/research-os-subpage-shell";
import { ACCENT_THEMES } from "@/components/research-os/research-os-theme";

const MAX_ZIP_BYTES = 80 * 1024 * 1024;

export default function ExplainResearchPage() {
  const [corpus, setCorpus] = useState("");
  const [meta, setMeta] = useState<ExplainResearchMeta | null>(null);
  const [history, setHistory] = useState<ExplainChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [idbReady, setIdbReady] = useState(false);
  const [restoredBanner, setRestoredBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await loadExplainProject();
        if (cancelled || !saved) {
          setIdbReady(true);
          return;
        }
        setCorpus(saved.corpus);
        setMeta(saved.meta);
        setHistory(saved.messages);
        setRestoredBanner(true);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setIdbReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (c: string, m: ExplainResearchMeta | null, h: ExplainChatMessage[]) => {
      if (!m || !c) return;
      await saveExplainProject(c, m, h);
    },
    []
  );

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      if (file.size > MAX_ZIP_BYTES) {
        setExtractError(`ZIP must be under ${MAX_ZIP_BYTES / (1024 * 1024)} MB`);
        return;
      }
      setExtractError(null);
      setExtracting(true);
      setRestoredBanner(false);
      try {
        const buf = await file.arrayBuffer();
        const { corpus: nextCorpus, stats } = unzipToTextCorpus(buf, file.name);
        const nextMeta: ExplainResearchMeta = {
          zipName: file.name,
          extractedAt: new Date().toISOString(),
          corpusTruncated: stats.corpusTruncated,
          corpusCharCount: stats.corpusCharCount,
          textFilesIncluded: stats.textFilesIncluded,
          totalZipEntries: stats.totalZipEntries,
          includedPathsSample: stats.includedPaths.slice(0, 40),
          filesSkippedByPath: stats.filesSkippedByPath,
          filesSkippedSize: stats.filesSkippedSize,
          filesSkippedBinary: stats.filesSkippedBinary,
          filesSkippedExtension: stats.filesSkippedExtension,
          filesSkippedOfficeParse: stats.filesSkippedOfficeParse,
          nestedZipsExpanded: stats.nestedZipsExpanded,
          pdfFilesInArchive: stats.pdfFilesInArchive,
        };
        setCorpus(nextCorpus);
        setMeta(nextMeta);
        setHistory([]);
        await saveExplainProject(nextCorpus, nextMeta, []);
      } catch (e) {
        setExtractError(
          e instanceof Error ? e.message : "Could not unpack this ZIP"
        );
      } finally {
        setExtracting(false);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] },
    maxFiles: 1,
    maxSize: MAX_ZIP_BYTES,
    disabled: extracting,
  });

  const handleClear = useCallback(async () => {
    await clearExplainProject();
    setCorpus("");
    setMeta(null);
    setHistory([]);
    setExtractError(null);
    setChatError(null);
    setRestoredBanner(false);
  }, []);

  const sendMessage = useCallback(async () => {
    const t = input.trim();
    if (!t || chatLoading) return;

    const nextHistory: ExplainChatMessage[] = [
      ...history,
      { role: "user", content: t },
    ];

    setChatLoading(true);
    setChatError(null);
    setInput("");

    try {
      const res = await fetch("/api/explain-research/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContext: corpus,
          messages: nextHistory,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Chat request failed");
      const assistantText = data.reply ?? "";
      const withAssistant: ExplainChatMessage[] = [
        ...nextHistory,
        { role: "assistant", content: assistantText },
      ];
      setHistory(withAssistant);
      if (meta && corpus) {
        await persist(corpus, meta, withAssistant);
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Chat failed");
      setInput(t);
    } finally {
      setChatLoading(false);
    }
  }, [input, history, corpus, meta, chatLoading, persist]);

  const theme = ACCENT_THEMES.violet;

  if (!idbReady) {
    return (
      <div className="relative flex min-h-screen items-center justify-center gap-2 bg-[#030303] text-sm text-zinc-400">
        <PrismGradientBg />
        <Loader2 className="relative z-10 h-6 w-6 animate-spin text-violet-400" />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  return (
    <ResearchOsSubpageShell
      accent="violet"
      title="Explain Research"
      subtitle="Upload a ZIP export and ask questions about your project"
      icon={FolderArchive}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        <div className="flex min-h-[42vh] flex-1 flex-col overflow-y-auto border-b border-white/10 lg:min-h-0 lg:border-r lg:border-b-0">
          <div className="space-y-4 p-4">
            {restoredBanner && meta && (
              <div className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-3 py-2 text-xs text-sky-100">
                Restored saved project: <strong>{meta.zipName}</strong>
              </div>
            )}

            <MagicPanel
              gradient={theme.gradient}
              accent={theme.accentHex}
              innerClassName="p-0 overflow-hidden"
            >
              <div
                {...getRootProps()}
                className={`cursor-pointer p-8 text-center transition-colors ${
                  extracting ? "pointer-events-none opacity-60" : ""
                } ${
                  isDragActive
                    ? theme.dropzoneActive
                    : `${theme.dropzoneIdle} border-2 border-dashed border-white/25`
                } rounded-[0.65rem]`}
              >
                <input {...getInputProps()} />
                {extracting ? (
                  <div className="flex flex-col items-center gap-2 text-sm text-zinc-400">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                    Unpacking ZIP in your browser…
                  </div>
                ) : (
                  <>
                    <FolderArchive className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
                    <p className="text-sm font-medium text-zinc-200">
                      Drop a ZIP export here (Notion, Drive, repo)
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Max {MAX_ZIP_BYTES / (1024 * 1024)} MB
                    </p>
                  </>
                )}
              </div>
            </MagicPanel>

            {extractError && (
              <p className="text-sm text-red-400">{extractError}</p>
            )}

            {meta && (
              <MagicPanel
                gradient={theme.gradient}
                accent={theme.accentHex}
                innerClassName="p-4"
              >
                <p className="text-sm text-zinc-300">
                  <span className="font-medium text-white">Loaded:</span>{" "}
                  {meta.zipName}
                </p>
                <button
                  type="button"
                  onClick={() => void handleClear()}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear saved project
                </button>
              </MagicPanel>
            )}

            {meta && meta.textFilesIncluded === 0 && meta.totalZipEntries > 0 && (
              <p className="text-sm text-zinc-500">
                No readable text was found in this archive. Try another export
                or different file types.
              </p>
            )}

            {corpus.length > 0 && (
              <MagicPanel
                gradient={theme.gradient}
                accent={theme.accentHex}
                innerClassName="p-0 overflow-hidden"
              >
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-200">
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    Preview extracted text
                  </summary>
                  <div className="border-t border-white/10 px-3 py-2">
                    <textarea
                      readOnly
                      value={
                        corpus.slice(0, 24_000) +
                        (corpus.length > 24_000 ? "\n\n… (preview trimmed)" : "")
                      }
                      className="h-48 w-full resize-y rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-xs text-zinc-300"
                    />
                  </div>
                </details>
              </MagicPanel>
            )}
          </div>
        </div>

        <div className="flex min-h-[45vh] w-full flex-col border-t border-white/10 bg-black/45 backdrop-blur-xl lg:max-h-[calc(100vh-57px)] lg:min-h-0 lg:w-[min(440px,100%)] lg:border-t-0 lg:border-l">
          <div className="border-b border-white/10 px-4 py-2">
            <div className="text-sm font-medium text-zinc-200">Assistant</div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {history.length === 0 && (
              <p className="text-sm text-zinc-500">
                After you load a ZIP, ask how the project is organized, what
                main ideas are, or how to run or extend the code.
              </p>
            )}
            {history.map((turn, i) => (
              <div
                key={i}
                className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm ${
                    turn.role === "user"
                      ? theme.userBubble
                      : "border border-white/10 bg-zinc-950/85 text-zinc-100"
                  }`}
                >
                  {turn.role === "user" && (
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  )}
                  {turn.role === "assistant" && (
                    <AssistantMarkdown content={turn.content} variant="dark" />
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
          </div>
          {chatError && (
            <div className="border-t border-red-500/30 bg-red-950/40 px-4 py-2 text-xs text-red-300">
              {chatError}
            </div>
          )}
          <div className="flex gap-2 border-t border-white/10 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask about the archive…"
              rows={3}
              className={`flex-1 resize-none rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 ${theme.focusRing}`}
              disabled={chatLoading}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={chatLoading}
              className="self-end rounded-xl border border-violet-400/35 bg-violet-600 p-3 text-white hover:bg-violet-500 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </ResearchOsSubpageShell>
  );
}
