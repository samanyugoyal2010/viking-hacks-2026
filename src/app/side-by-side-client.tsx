"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-border bg-card shrink-0 border-b">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/mascot-light.png"
              alt=""
              width={40}
              height={40}
              className="h-9 w-auto shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="text-foreground text-lg font-semibold tracking-tight">
                Side-by-side PDF chat
              </h1>
              <p className="text-muted-foreground text-xs">
                Upload a PDF, highlight text, capture pages, attach images
              </p>
            </div>
          </div>
          <Link
            href="/main"
            className="text-primary hover:text-primary/80 shrink-0 text-sm font-medium"
          >
            ← Home
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 max-w-[1600px] mx-auto w-full">
        {/* PDF column */}
        <div
          ref={shellRef}
          className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200 min-h-[50vh] lg:min-h-0"
        >
          {!file ? (
            <div
              {...getRootProps()}
              className={`
                m-4 flex-1 rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center cursor-pointer
                transition-colors
                ${isDragActive ? "border-sky-400 bg-sky-50" : "border-zinc-300 bg-white hover:border-sky-300"}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-zinc-400 mb-3" />
              <p className="text-sm font-medium text-zinc-700">
                Drop a PDF here or click to browse
              </p>
              <p className="text-xs text-zinc-400 mt-1">Max 30 MB</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 bg-zinc-50/80 flex-wrap">
                <button
                  type="button"
                  {...getRootProps({ className: "inline-flex" })}
                  className="text-xs font-medium text-sky-700 hover:underline px-2 py-1"
                >
                  <input {...getInputProps()} />
                  Replace PDF
                </button>
                <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                  {file.name}
                </span>
                {extracting && (
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Extracting text…
                  </span>
                )}
                {extractError && (
                  <span className="text-xs text-red-600">{extractError}</span>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 py-2 px-3 bg-white border-b border-zinc-100 flex-wrap">
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-zinc-600 tabular-nums min-w-[100px] text-center">
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
                  className="p-2 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void addScreenshot()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Screenshot page
                </button>
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
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
                className="flex-1 overflow-auto p-4 bg-zinc-100 relative"
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
                      <div className="p-12 flex justify-center text-zinc-500 text-sm">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    }
                    error={
                      <div className="p-8 text-red-600 text-sm">
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium px-3 py-2 shadow-lg hover:bg-sky-700"
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
        <div className="w-full lg:w-[min(440px,100%)] flex flex-col bg-white min-h-[40vh] lg:min-h-0 lg:max-h-[calc(100vh-57px)]">
          <div className="px-4 py-2 border-b border-zinc-100">
            <div className="text-sm font-medium text-zinc-800">Assistant</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      ? "bg-sky-600 text-white"
                      : "bg-zinc-100 text-zinc-800"
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
          {pendingImages.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-100 flex flex-wrap gap-2">
              {pendingImages.map((url, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-16 w-auto rounded border border-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingImages((p) => p.filter((_, j) => j !== i))
                    }
                    className="absolute -top-1 -right-1 bg-zinc-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border-t border-zinc-100 flex gap-2">
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
              className="flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              disabled={chatLoading}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={chatLoading}
              className="self-end p-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
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
