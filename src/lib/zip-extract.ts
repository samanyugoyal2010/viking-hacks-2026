import { unzipSync } from "fflate";

/** Max characters in the final corpus sent to the model */
export const MAX_CORPUS_CHARS = 180_000;

/** Skip reading any single file larger than this (bytes) */
const MAX_SINGLE_FILE_BYTES = 512 * 1024;

const SKIP_PATH_SEGMENTS = new Set([
  "node_modules",
  ".git",
  "__pycache__",
  ".next",
  "target",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
]);

const SKIP_PREFIXES = ["__MACOSX/", ".DS_Store"];

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".text",
  ".json",
  ".csv",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyw",
  ".java",
  ".go",
  ".rs",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".svg",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cc",
  ".cs",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".kts",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".env.example",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".dockerignore",
  "dockerfile",
  "makefile",
  ".tex",
  ".bib",
  ".r",
  ".jl",
  ".scala",
  ".clj",
  ".ex",
  ".exs",
  ".elm",
  ".vue",
  ".svelte",
  ".prisma",
  ".graphql",
  ".gql",
  ".ini",
  ".cfg",
  ".conf",
  ".properties",
  ".gradle",
  ".nix",
]);

export type ZipExtractStats = {
  zipName: string;
  totalZipEntries: number;
  textFilesIncluded: number;
  filesSkippedByPath: number;
  filesSkippedSize: number;
  filesSkippedBinary: number;
  filesSkippedExtension: number;
  corpusTruncated: boolean;
  corpusCharCount: number;
  includedPaths: string[];
};

function normalizePath(raw: string): string {
  return raw.replace(/\\/g, "/").replace(/^\/+/, "");
}

function shouldSkipPath(norm: string): boolean {
  if (!norm || norm.endsWith("/")) return true;
  for (const p of SKIP_PREFIXES) {
    if (norm === p || norm.startsWith(p + "/") || norm.includes("/" + p + "/"))
      return true;
  }
  const parts = norm.split("/");
  for (const seg of parts) {
    if (SKIP_PATH_SEGMENTS.has(seg)) return true;
    if (seg === "dist" || seg === "build") return true;
  }
  return false;
}

function extensionOf(norm: string): string {
  const base = norm.split("/").pop() ?? "";
  const i = base.lastIndexOf(".");
  if (i <= 0) return "";
  return base.slice(i).toLowerCase();
}

function basenameLower(norm: string): string {
  const base = norm.split("/").pop() ?? "";
  return base.toLowerCase();
}

function isAllowedExtension(norm: string): boolean {
  const ext = extensionOf(norm);
  if (TEXT_EXTENSIONS.has(ext)) return true;
  const name = basenameLower(norm);
  if (
    name === "dockerfile" ||
    name === "makefile" ||
    name === "readme" ||
    name.startsWith("readme.") ||
    name === ".env.example" ||
    name.endsWith(".env.example")
  )
    return true;
  return false;
}

function looksBinary(buf: Uint8Array): boolean {
  const n = Math.min(buf.length, 8192);
  if (n === 0) return false;
  let nulls = 0;
  for (let i = 0; i < n; i++) {
    if (buf[i] === 0) nulls++;
  }
  return nulls / n > 0.001;
}

function decodeAsUtf8(buf: Uint8Array): string | null {
  try {
    const dec = new TextDecoder("utf-8", { fatal: true });
    return dec.decode(buf);
  } catch {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(buf);
    } catch {
      return null;
    }
  }
}

export type ZipExtractResult = {
  corpus: string;
  stats: ZipExtractStats;
};

/**
 * Unzip in-memory and build a single text corpus for LLM context.
 */
export function unzipToTextCorpus(
  zipArrayBuffer: ArrayBuffer,
  zipName: string
): ZipExtractResult {
  const uint8 = new Uint8Array(zipArrayBuffer);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(uint8);
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : "Could not read ZIP archive"
    );
  }

  const pathToData = new Map<string, Uint8Array>();
  for (const [raw, data] of Object.entries(files)) {
    const norm = normalizePath(raw);
    if (!norm || norm.endsWith("/")) continue;
    pathToData.set(norm, data);
  }

  const paths = [...pathToData.keys()].sort((a, b) => a.localeCompare(b));

  const stats: ZipExtractStats = {
    zipName,
    totalZipEntries: paths.length,
    textFilesIncluded: 0,
    filesSkippedByPath: 0,
    filesSkippedSize: 0,
    filesSkippedBinary: 0,
    filesSkippedExtension: 0,
    corpusTruncated: false,
    corpusCharCount: 0,
    includedPaths: [],
  };

  const chunks: string[] = [];

  for (const norm of paths) {
    if (shouldSkipPath(norm)) {
      stats.filesSkippedByPath++;
      continue;
    }
    if (!isAllowedExtension(norm)) {
      stats.filesSkippedExtension++;
      continue;
    }

    const buf = pathToData.get(norm);
    if (!buf || buf.length === 0) continue;
    if (buf.length > MAX_SINGLE_FILE_BYTES) {
      stats.filesSkippedSize++;
      continue;
    }
    if (looksBinary(buf)) {
      stats.filesSkippedBinary++;
      continue;
    }

    const text = decodeAsUtf8(buf);
    if (text === null || text.trim().length === 0) {
      stats.filesSkippedBinary++;
      continue;
    }

    const section = `--- ${norm} ---\n${text.trim()}\n\n`;
    chunks.push(section);
    stats.textFilesIncluded++;
    stats.includedPaths.push(norm);
  }

  let corpus = chunks.join("");
  if (corpus.length > MAX_CORPUS_CHARS) {
    corpus = corpus.slice(0, MAX_CORPUS_CHARS);
    stats.corpusTruncated = true;
  }
  stats.corpusCharCount = corpus.length;

  return { corpus, stats };
}
