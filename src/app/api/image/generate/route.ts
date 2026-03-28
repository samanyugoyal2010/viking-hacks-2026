import { NextRequest, NextResponse } from "next/server";
import {
  extractTextFromUpload,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload-text-extract";

/** Always returned for /image uploads (static asset under /public). */
const STATIC_IMAGE_PATH = "/project-explainer-placeholder.png";

const ALLOWED_ASPECT = new Set([
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
]);

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_UPLOAD_BYTES * 2) {
      return NextResponse.json(
        { error: `Request too large (max ~${MAX_UPLOAD_BYTES / (1024 * 1024)} MB file).` },
        { status: 413 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const aspectRaw = form.get("aspectRatio");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing file (multipart field: file)" },
        { status: 400 }
      );
    }

    const fileName =
      file instanceof File && file.name ? file.name : "upload.bin";

    const aspectRatio =
      typeof aspectRaw === "string" && ALLOWED_ASPECT.has(aspectRaw)
        ? aspectRaw
        : "16:9";

    const { truncated, fileKind } = await extractTextFromUpload(file, fileName);

    return NextResponse.json({
      imageUrl: STATIC_IMAGE_PATH,
      imagePrompt:
        "Static infographic: “Attention Is All You Need” / Transformer architecture (reference image).",
      plannerText:
        "This build always returns the same reference diagram after a valid upload; no live image model is called.",
      textModel: "n/a",
      imageModel: "static/project-explainer-placeholder.png",
      imageProvider: "static",
      truncated,
      fileKind,
      aspectRatio,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status =
      message.includes("Unsupported file") || message.includes("too large")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
