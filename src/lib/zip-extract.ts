import { unzipSync } from "fflate";

/** Max characters in the final corpus sent to the model */
export const MAX_CORPUS_CHARS = 180_000;

/** Skip reading any single file larger than this (bytes) */
const MAX_SINGLE_FILE_BYTES = 512 * 1024;

/** Max nesting depth when expanding archives-in-archives (e.g. Notion export) */
const MAX_NEST_ZIP_DEPTH = 4;

/** Reject nested zip payloads larger than this to limit zip-bomb surface */
const MAX_NESTED_ZIP_BYTES = 24 * 1024 * 1024;

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
  ".docx",
  ".xlsx",
]);

export type ZipExtractStats = {
  zipName: string;
  totalZipEntries: number;
  textFilesIncluded: number;
  filesSkippedByPath: number;
  filesSkippedSize: number;
  filesSkippedBinary: number;
  filesSkippedExtension: number;
  filesSkippedOfficeParse: number;
  nestedZipsExpanded: number;
  pdfFilesInArchive: number;
  corpusTruncated: boolean;
  corpusCharCount: number;
  includedPaths: string[];
};

function normalizePath(raw: string): string {
  return raw.replace(/\\/g, "/").replace(/^\/+/, "");
}

function joinZipPath(prefix: string, raw: string): string {
  const n = normalizePath(raw);
  if (!prefix) return n;
  return `${prefix}/${n}`;
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

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function docxToPlainText(buf: Uint8Array): string | null {
  let inner: Record<string, Uint8Array>;
  try {
    inner = unzipSync(buf);
  } catch {
    return null;
  }
  const docXml = inner["word/document.xml"];
  if (!docXml?.length) return null;
  const xml = decodeAsUtf8(docXml);
  if (!xml) return null;
  let t = xml.replace(/<\/w:p>/gi, "\n").replace(/<\/w:tr>/gi, "\n");
  t = t.replace(/<[^>]+>/g, " ");
  t = decodeXmlEntities(t);
  return t
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function xlsxToPlainText(buf: Uint8Array): string | null {
  let inner: Record<string, Uint8Array>;
  try {
    inner = unzipSync(buf);
  } catch {
    return null;
  }
  const parts: string[] = [];
  const ss = inner["xl/sharedStrings.xml"];
  if (ss?.length) {
    const xml = decodeAsUtf8(ss);
    if (xml) {
      const re = /<t[^>]*>([^<]*)<\/t>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        const chunk = m[1].trim();
        if (chunk) parts.push(chunk);
      }
    }
  }
  for (const key of Object.keys(inner).sort()) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/i.test(key)) continue;
    const sheet = inner[key];
    if (!sheet?.length) continue;
    const xml = decodeAsUtf8(sheet);
    if (!xml) continue;
    const re = /<v>([^<]+)<\/v>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const v = m[1].trim();
      if (v.length > 0) parts.push(v);
    }
  }
  if (parts.length === 0) return null;
  return [...new Set(parts)].join("\n");
}

/**
 * Unzip one archive and merge nested .zip members into a flat path→bytes map.
 */
function expandZipArchive(rootBytes: Uint8Array): {
  map: Map<string, Uint8Array>;
  nestedZipsExpanded: number;
} {
  type Job = { prefix: string; bytes: Uint8Array; depth: number };
  const jobs: Job[] = [{ prefix: "", bytes: rootBytes, depth: 0 }];
  const out = new Map<string, Uint8Array>();
  let nestedZipsExpanded = 0;

  while (jobs.length > 0) {
    const { prefix, bytes, depth } = jobs.pop()!;
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(bytes);
    } catch {
      continue;
    }
    for (const [raw, data] of Object.entries(entries)) {
      const norm = joinZipPath(prefix, raw);
      if (!norm || norm.endsWith("/")) continue;

      const canNest =
        /\.zip$/i.test(norm) &&
        depth < MAX_NEST_ZIP_DEPTH &&
        data.length > 0 &&
        data.length <= MAX_NESTED_ZIP_BYTES;

      if (canNest) {
        try {
          unzipSync(data);
          const dirPrefix = norm.replace(/\.zip$/i, "");
          jobs.push({ prefix: dirPrefix, bytes: data, depth: depth + 1 });
          nestedZipsExpanded++;
        } catch {
          out.set(norm, data);
        }
      } else {
        out.set(norm, data);
      }
    }
  }

  return { map: out, nestedZipsExpanded };
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
  const { map: pathToData, nestedZipsExpanded } = expandZipArchive(uint8);

  const paths = [...pathToData.keys()].sort((a, b) => a.localeCompare(b));

  const stats: ZipExtractStats = {
    zipName,
    totalZipEntries: paths.length,
    textFilesIncluded: 0,
    filesSkippedByPath: 0,
    filesSkippedSize: 0,
    filesSkippedBinary: 0,
    filesSkippedExtension: 0,
    filesSkippedOfficeParse: 0,
    nestedZipsExpanded,
    pdfFilesInArchive: 0,
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
      if (extensionOf(norm) === ".pdf") stats.pdfFilesInArchive++;
      continue;
    }

    const buf = pathToData.get(norm);
    if (!buf || buf.length === 0) continue;
    if (buf.length > MAX_SINGLE_FILE_BYTES) {
      stats.filesSkippedSize++;
      continue;
    }

    const ext = extensionOf(norm);
    let text: string | null = null;

    if (ext === ".docx") {
      text = docxToPlainText(buf);
      if (text === null || text.trim().length === 0) {
        stats.filesSkippedOfficeParse++;
        continue;
      }
    } else if (ext === ".xlsx") {
      text = xlsxToPlainText(buf);
      if (text === null || text.trim().length === 0) {
        stats.filesSkippedOfficeParse++;
        continue;
      }
    } else {
      if (looksBinary(buf)) {
        stats.filesSkippedBinary++;
        continue;
      }
      text = decodeAsUtf8(buf);
      if (text === null || text.trim().length === 0) {
        stats.filesSkippedBinary++;
        continue;
      }
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
