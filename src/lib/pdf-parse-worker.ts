import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

let configured = false;

function findPdfParseRoot(require: NodeJS.Require): string {
  const entry = require.resolve("pdf-parse");
  let dir = path.dirname(entry);
  for (let i = 0; i < 16; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
          name?: string;
        };
        if (pkg.name === "pdf-parse") return dir;
      } catch {
        /* continue */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find pdf-parse package root");
}

/**
 * pdf-parse loads pdfjs legacy build; without a real worker file URL, Next/Turbopack
 * resolves pdf.worker.mjs under .next chunks and fake-worker setup fails.
 */
export function ensurePdfParseWorker(): void {
  if (configured) return;
  const require = createRequire(import.meta.url);
  const pdfParseRoot = findPdfParseRoot(require);
  const candidates = [
    path.join(pdfParseRoot, "node_modules", "pdfjs-dist", "build", "pdf.worker.mjs"),
  ];
  try {
    const topPdfjsPkg = path.dirname(require.resolve("pdfjs-dist/package.json"));
    candidates.push(path.join(topPdfjsPkg, "build", "pdf.worker.mjs"));
  } catch {
    /* optional fallback */
  }
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error("pdf.worker.mjs not found; check pdf-parse / pdfjs-dist install");
  }
  PDFParse.setWorker(pathToFileURL(found).href);
  configured = true;
}
