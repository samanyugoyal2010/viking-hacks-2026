"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Upload,
  MessageCircle,
  Camera,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";
import { MagicPanel } from "@/components/research-os/magic-panel";
import { ResearchOsSubpageShell } from "@/components/research-os/research-os-subpage-shell";
import { ACCENT_THEMES } from "@/components/research-os/research-os-theme";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatTurn =
  | { role: "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string };

type SelectionPopup = {
  text: string;
  left: number;
  top: number;
};

async function capturePageDataUrl(
  arrayBuffer: ArrayBuffer,
  pageNumber: number,
  scale = 2
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Screenshot is only available in the browser");
  }
  // Use the same pdfjs instance as react-pdf. Do not touch GlobalWorkerOptions here —
  // a separate dynamic import can share that singleton; reassigning workerSrc resets
  // the worker and tears down the on-screen Document (looks like a full refresh).
  const data = new Uint8Array(arrayBuffer.slice(0));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page
      .render({
        canvasContext: ctx,
        viewport,
        canvas,
      })
      .promise;
    return canvas.toDataURL("image/png");
  } finally {
    await pdf.destroy().catch(() => {});
  }
}


export default function SideBySideClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewerWidth, setViewerWidth] = useState(560);
  const [documentContext, setDocumentContext] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(
    null
  );

  const viewerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  useEffect(() => {
    if (!file) {
      setPdfUrl(null);
      fileBufferRef.current = null;
      return;
    }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    void file.arrayBuffer().then((b) => {
      fileBufferRef.current = b;
    });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setViewerWidth(Math.max(280, Math.min(w - 32, 720)));
    });
    ro.observe(el);
    setViewerWidth(Math.max(280, Math.min(el.clientWidth - 32, 720)));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!file) {
      setDocumentContext("");
      setExtractError(null);
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setExtracting(true);
    setExtractError(null);
    fetch("/api/side-by-side/extract", { method: "POST", body: fd })
      .then(async (res) => {
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) throw new Error(data.error || "Extract failed");
        setDocumentContext(data.text ?? "");
      })
      .catch((e) =>
        setExtractError(e instanceof Error ? e.message : "Extract failed")
      )
      .finally(() => setExtracting(false));
  }, [file]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setPageNumber(1);
      setHistory([]);
      setSelectionPopup(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 30 * 1024 * 1024,
    noClick: !!file,
    noKeyboard: !!file,
  });

  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const root = viewerRef.current;
    if (!sel || !root || sel.isCollapsed) {
      setSelectionPopup(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setSelectionPopup(null);
      return;
    }
    let inside = false;
    for (let i = 0; i < sel.rangeCount; i++) {
      const node = sel.getRangeAt(i).commonAncestorContainer;
      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
      if (el && root.contains(el)) {
        inside = true;
        break;
      }
    }
    if (!inside) {
      setSelectionPopup(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionPopup({
      text,
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  }, []);

  const askChatFromSelection = useCallback(() => {
    if (!selectionPopup) return;
    const q = `Regarding this excerpt from page ${pageNumber}:\n\n"""${selectionPopup.text}"""\n\n`;
    setInput((prev) => q + (prev.trim() ? prev : ""));
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
    composerRef.current?.focus();
  }, [selectionPopup, pageNumber]);

  const addScreenshot = useCallback(async () => {
    const buf = fileBufferRef.current;
    if (!buf) return;
    try {
      const dataUrl = await capturePageDataUrl(buf, pageNumber, 2);
      setPendingImages((p) => [...p, dataUrl]);
      setInput((prev) =>
        prev.trim()
          ? prev
          : `Screenshot of PDF page ${pageNumber}. What do you see?`
      );
    } catch (e) {
      setChatError(
        e instanceof Error ? e.message : "Could not capture page screenshot"
      );
    }
  }, [pageNumber]);

  const onPickImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f || !f.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result;
        if (typeof r === "string") {
          setPendingImages((p) => [...p, r]);
        }
      };
      reader.readAsDataURL(f);
    },
    []
  );

  const sendMessage = useCallback(async () => {
    const parts: ContentPart[] = [];
    for (const url of pendingImages) {
      parts.push({ type: "image_url", image_url: { url } });
    }
    const t = input.trim();
    if (t) parts.push({ type: "text", text: t });
    if (parts.length === 0) return;

    const userContent: string | ContentPart[] =
      parts.length === 1 && parts[0].type === "text"
        ? parts[0].text
        : parts;

    const nextHistory: ChatTurn[] = [
      ...history,
      { role: "user", content: userContent },
    ];

    setChatLoading(true);
    setChatError(null);
    setInput("");
    setPendingImages([]);

    try {
      const res = await fetch("/api/side-by-side/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContext,
          messages: nextHistory,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Chat request failed");
      setHistory([
        ...nextHistory,
        { role: "assistant", content: data.reply ?? "" },
      ]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Chat failed");
      setHistory(history);
      setInput(t);
      setPendingImages(pendingImages);
    } finally {
      setChatLoading(false);
    }
  }, [pendingImages, input, history, documentContext]);

  const docKey = useMemo(() => pdfUrl ?? "none", [pdfUrl]);
  const theme = ACCENT_THEMES.sky;

  return (
    <ResearchOsSubpageShell
      accent="sky"
      title="Side-by-side PDF chat"
      subtitle="Upload a PDF, highlight text, capture pages, attach images"
      icon={MessageCircle}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* PDF column */}
        <div
          ref={shellRef}
          className="flex min-h-[50vh] flex-1 flex-col border-b border-white/10 lg:min-h-0 lg:border-r lg:border-b-0"
        >
          {!file ? (
            <div className="m-4 flex-1">
              <MagicPanel
                gradient={theme.gradient}
                accent={theme.accentHex}
                innerClassName="p-0 overflow-hidden"
              >
                <div
                  {...getRootProps()}
                  className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[0.65rem] border-2 border-dashed p-10 transition-colors ${
                    isDragActive
                      ? theme.dropzoneActive
                      : `${theme.dropzoneIdle} border-white/25`
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mb-3 h-10 w-10 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-200">
                    Drop a PDF here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Max 30 MB</p>
                </div>
              </MagicPanel>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
                <button
                  type="button"
                  {...getRootProps({ className: "inline-flex" })}
                  className={`px-2 py-1 text-xs font-medium ${theme.subtleLink}`}
                >
                  <input {...getInputProps()} />
                  Replace PDF
                </button>
                <span className="max-w-[200px] truncate text-xs text-zinc-500">
                  {file.name}
                </span>
                {extracting && (
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Extracting text…
                  </span>
                )}
                {extractError && (
                  <span className="text-xs text-red-400">{extractError}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/10 bg-black/35 px-3 py-2 backdrop-blur-sm">
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-white/15 bg-white/5 p-2 text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[100px] text-center text-sm tabular-nums text-zinc-300">
                  Page {pageNumber}
                  {numPages ? ` / ${numPages}` : ""}
                </span>
                <button
                  type="button"
                  disabled={!numPages || pageNumber >= numPages}
                  onClick={() =>
                    setPageNumber((p) =>
                      numPages ? Math.min(numPages, p + 1) : p + 1
                    )
                  }
                  className="rounded-lg border border-white/15 bg-white/5 p-2 text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void addScreenshot()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Screenshot page
                </button>
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Attach image
                </button>
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickImage}
                />
              </div>
              <div
                ref={viewerRef}
                className="relative flex-1 overflow-auto bg-black/30 p-4"
                onMouseUp={onMouseUp}
              >
                <div className="mx-auto shadow-lg rounded bg-white w-fit max-w-full">
                  <Document
                    key={docKey}
                    file={pdfUrl ?? undefined}
                    onLoadSuccess={({ numPages: n }) => {
                      setNumPages(n);
                      setPageNumber(1);
                    }}
                    loading={
                      <div className="flex justify-center p-12 text-sm text-zinc-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    }
                    error={
                      <div className="p-8 text-sm text-red-400">
                        Failed to load PDF.
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={viewerWidth}
                      renderTextLayer
                      renderAnnotationLayer
                    />
                  </Document>
                </div>

                {selectionPopup && (
                  <div
                    className="fixed z-50 -translate-x-1/2 -translate-y-full"
                    style={{
                      left: selectionPopup.left,
                      top: selectionPopup.top,
                    }}
                  >
                    <button
                      type="button"
                      onClick={askChatFromSelection}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-sky-950/50 hover:bg-sky-500"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Ask chat
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Chat column */}
        <div className="flex min-h-[40vh] w-full flex-col border-t border-white/10 bg-black/45 backdrop-blur-xl lg:max-h-[calc(100vh-57px)] lg:min-h-0 lg:w-[min(440px,100%)] lg:border-t-0 lg:border-l">
          <div className="border-b border-white/10 px-4 py-2">
            <div className="text-sm font-medium text-zinc-200">Assistant</div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {history.length === 0 && (
              <p className="text-sm text-zinc-500">
                Ask questions about the PDF. Highlight text and click &quot;Ask
                chat&quot;, use &quot;Screenshot page&quot; to send the current
                page as an image, or attach any image.
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
                  {turn.role === "user" &&
                    typeof turn.content !== "string" &&
                    turn.content.map((part, j) =>
                      part.type === "image_url" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={j}
                          src={part.image_url.url}
                          alt=""
                          className="max-w-full rounded-lg mb-2 border border-white/20"
                        />
                      ) : (
                        <p key={j} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      )
                    )}
                  {turn.role === "user" && typeof turn.content === "string" && (
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
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-2">
              {pendingImages.map((url, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-16 w-auto rounded border border-white/15"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingImages((p) => p.filter((_, j) => j !== i))
                    }
                    className="absolute -top-1 -right-1 rounded-full bg-zinc-900 p-0.5 text-white opacity-0 ring-1 ring-white/20 group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 border-t border-white/10 p-3">
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Message… (Enter to send, Shift+Enter newline)"
              rows={3}
              className={`flex-1 resize-none rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 ${theme.focusRing}`}
              disabled={chatLoading}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={chatLoading}
              className="self-end rounded-xl border border-sky-400/35 bg-sky-600 p-3 text-white hover:bg-sky-500 disabled:opacity-50"
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
