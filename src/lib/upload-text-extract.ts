import { PDFParse } from "pdf-parse";
import { unzipToTextCorpus } from "@/lib/zip-extract";

/** Max upload size for /api/image/generate (bytes) */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Max plain-text file size (bytes) */
const MAX_PLAIN_TEXT_BYTES = 2 * 1024 * 1024;

/** Truncated corpus cap for planner + image pipeline */
export const MAX_PLANNER_CORPUS_CHARS = 56_000;

export type ExtractFileKind = "pdf" | "zip" | "text";

export type UploadExtractResult = {
  text: string;
  truncated: boolean;
  fileKind: ExtractFileKind;
};

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i <= 0) return "";
  return name.slice(i).toLowerCase();
}

function detectKind(fileName: string, mime: string): ExtractFileKind | null {
  const ext = extensionOf(fileName);
  const m = mime.toLowerCase();
  if (
    ext === ".pdf" ||
    m === "application/pdf" ||
    m === "application/x-pdf"
  ) {
    return "pdf";
  }
  if (
    ext === ".zip" ||
    m === "application/zip" ||
    m === "application/x-zip-compressed"
  ) {
    return "zip";
  }
  if (
    [".txt", ".md", ".csv", ".json", ".mdx"].includes(ext) ||
    m.startsWith("text/") ||
    m === "application/json" ||
    m === "application/csv"
  ) {
    return "text";
  }
  return null;
}

function truncateCorpus(s: string): { text: string; truncated: boolean } {
  if (s.length <= MAX_PLANNER_CORPUS_CHARS) {
    return { text: s, truncated: false };
  }
  return {
    text: s.slice(0, MAX_PLANNER_CORPUS_CHARS),
    truncated: true,
  };
}

async function extractPdf(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

/**
 * Extract plain text from an uploaded file for project-image generation.
 */
export async function extractTextFromUpload(
  file: File | Blob,
  fileName: string
): Promise<UploadExtractResult> {
  const kind = detectKind(fileName, (file as File).type ?? "");
  if (!kind) {
    throw new Error(
      "Unsupported file type. Use PDF, ZIP, or a text file (.txt, .md, .csv, .json)."
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`
    );
  }

  let raw = "";

  if (kind === "pdf") {
    raw = await extractPdf(buf);
  } else if (kind === "zip") {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const { corpus } = unzipToTextCorpus(ab, fileName);
    raw = corpus;
  } else {
    if (buf.length > MAX_PLAIN_TEXT_BYTES) {
      throw new Error(
        `Text file too large (max ${MAX_PLAIN_TEXT_BYTES / (1024 * 1024)} MB).`
      );
    }
    try {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    }
    raw = `--- ${fileName} ---\n${raw}`;
  }

  const { text, truncated } = truncateCorpus(raw.trim());

  return {
    text,
    truncated,
    fileKind: kind,
  };
}
