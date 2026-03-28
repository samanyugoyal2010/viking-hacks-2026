"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  FolderArchive,
  Loader2,
  Send,
  Trash2,
  ChevronDown,
  AlertTriangle,
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
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [idbReady, setIdbReady] = useState(false);
  const [restoredBanner, setRestoredBanner] = useState(false);

  useEffect(() => {
    fetch("/api/side-by-side/model")
      .then((r) => r.json())
      .then((d: { model?: string }) => {
        if (typeof d.model === "string") setActiveModel(d.model);
      })
      .catch(() => setActiveModel(null));
  }, []);

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

  if (!idbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] text-zinc-500 text-sm gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <header className="border-b border-zinc-200 bg-white shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <FolderArchive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Explain Research
              </h1>
              <p className="text-xs text-zinc-500">
                ZIP unpacks in your browser; context stays local until you chat
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

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 max-w-[1600px] mx-auto w-full">
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200 min-h-[42vh] lg:min-h-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div
              className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 flex gap-2"
              role="status"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
              <p>
                Do not upload ZIPs that contain secrets (API keys, passwords).
                Unpacking runs in your browser; chat sends text to the model
                provider.
              </p>
            </div>

            {restoredBanner && meta && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                Restored saved project: <strong>{meta.zipName}</strong>
              </div>
            )}

            <div
              {...getRootProps()}
              className={`
                rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-violet-400 bg-violet-50" : "border-zinc-300 bg-white hover:border-violet-300"}
                ${extracting ? "opacity-60 pointer-events-none" : ""}
              `}
            >
              <input {...getInputProps()} />
              {extracting ? (
                <div className="flex flex-col items-center gap-2 text-zinc-600 text-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                  Unpacking ZIP in your browser…
                </div>
              ) : (
                <>
                  <FolderArchive className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-700">
                    Drop a ZIP export here (Notion, Drive, repo)
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Max {MAX_ZIP_BYTES / (1024 * 1024)} MB — processed locally
                  </p>
                </>
              )}
            </div>

            {extractError && (
              <p className="text-sm text-red-600">{extractError}</p>
            )}

            {meta && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 space-y-1">
                <p>
                  <span className="font-medium">Archive:</span> {meta.zipName}
                </p>
                <p>
                  <span className="font-medium">Text files in corpus:</span>{" "}
                  {meta.textFilesIncluded} (from {meta.totalZipEntries} paths)
                </p>
                <p>
                  <span className="font-medium">Corpus size:</span>{" "}
                  {meta.corpusCharCount.toLocaleString()} characters
                  {meta.corpusTruncated ? " (truncated)" : ""}
                </p>
                <button
                  type="button"
                  onClick={() => void handleClear()}
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-red-700 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear saved project
                </button>
              </div>
            )}

            {meta && meta.textFilesIncluded === 0 && meta.totalZipEntries > 0 && (
              <div
                className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-amber-950 space-y-2"
                role="status"
              >
                <p className="font-medium text-amber-950">
                  No readable text was extracted from this archive.
                </p>
                {(meta.nestedZipsExpanded ?? 0) > 0 && (
                  <p className="text-xs text-amber-900/90">
                    Nested ZIPs unpacked: {meta.nestedZipsExpanded}. If you still
                    see no text, inner files may be an unsupported type.
                  </p>
                )}
                <ul className="text-xs text-amber-900/90 list-disc pl-4 space-y-0.5">
                  <li>
                    Skipped (path filters):{" "}
                    {meta.filesSkippedByPath ?? "—"}
                  </li>
                  <li>
                    Skipped (unsupported extension):{" "}
                    {meta.filesSkippedExtension ?? "—"}
                  </li>
                  <li>
                    Skipped (file too large):{" "}
                    {meta.filesSkippedSize ?? "—"}
                  </li>
                  <li>
                    Skipped (binary / empty decode):{" "}
                    {meta.filesSkippedBinary ?? "—"}
                  </li>
                  <li>
                    Office parse failed (.docx/.xlsx):{" "}
                    {meta.filesSkippedOfficeParse ?? "—"}
                  </li>
                </ul>
                {(meta.pdfFilesInArchive ?? 0) > 0 && (
                  <p className="text-xs text-amber-900 pt-1 border-t border-amber-200/80">
                    This archive includes {meta.pdfFilesInArchive} PDF
                    {meta.pdfFilesInArchive === 1 ? "" : "s"}. PDF text is not
                    extracted from ZIPs here. Export pages as Markdown or Word, or
                    open a single PDF in{" "}
                    <Link
                      href="/side-by-side"
                      className="font-medium text-amber-950 underline underline-offset-2"
                    >
                      Side-by-side PDF chat
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}

            {corpus.length > 0 && (
              <details className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-zinc-800 flex items-center gap-2">
                  <ChevronDown className="h-4 w-4" />
                  Preview extracted text
                </summary>
                <div className="border-t border-zinc-100 px-3 py-2">
                  <textarea
                    readOnly
                    value={corpus.slice(0, 24_000) + (corpus.length > 24_000 ? "\n\n… (preview trimmed)" : "")}
                    className="w-full h-48 text-xs font-mono bg-zinc-50 rounded-lg p-2 border border-zinc-100 resize-y"
                  />
                  {meta && meta.includedPathsSample.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-2">
                      Sample paths:{" "}
                      {meta.includedPathsSample.slice(0, 8).join(", ")}
                      {meta.includedPathsSample.length > 8 ? "…" : ""}
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[min(440px,100%)] flex flex-col bg-white min-h-[45vh] lg:min-h-0 lg:max-h-[calc(100vh-57px)]">
          <div className="px-4 py-2 border-b border-zinc-100">
            <div className="text-sm font-medium text-zinc-800">Assistant</div>
            {activeModel && (
              <div
                className="text-[11px] text-zinc-500 mt-0.5 font-mono truncate"
                title={activeModel}
              >
                Model: {activeModel}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {turn.role === "user" && (
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  )}
                  {turn.role === "assistant" && (
                    <AssistantMarkdown content={turn.content} />
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 rounded-2xl px-3 py-2 text-sm text-zinc-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
          </div>
          {chatError && (
            <div className="px-4 py-2 text-xs text-red-600 border-t border-red-100 bg-red-50">
              {chatError}
            </div>
          )}
          <div className="p-3 border-t border-zinc-100 flex gap-2">
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
              className="flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              disabled={chatLoading}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={chatLoading}
              className="self-end p-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
