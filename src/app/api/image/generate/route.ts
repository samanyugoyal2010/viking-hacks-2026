import { NextRequest, NextResponse } from "next/server";
import {
  extractTextFromUpload,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload-text-extract";
import {
  PROJECT_IMAGE_PLANNER_SYSTEM,
  projectImagePlannerUserMessage,
  fallbackImagePromptFromCorpus,
} from "@/lib/project-image-prompts";
import {
  getImageModel,
  getTextModel,
  hasOpenRouterKeysForImage,
  isOpenRouterRateOrQuotaError,
  openRouterChatText,
  openRouterGenerateImage,
  getOpenRouterPlannerApiKey,
} from "@/lib/openrouter-client";

/** Stock image when OpenRouter image is rate-limited (static asset under /public). */
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

function httpStatusFromOpenRouterError(message: string): number | undefined {
  const m = message.match(/\(HTTP (\d+)\)\s*$/);
  if (!m) return undefined;
  return parseInt(m[1], 10);
}

export async function POST(req: NextRequest) {
  try {
    if (!hasOpenRouterKeysForImage()) {
      return NextResponse.json(
        {
          error:
            "Set OPENROUTER_IMAGE_API_KEY and/or OPENROUTER_API_KEY in .env or .env.local for image generation.",
        },
        { status: 400 }
      );
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_UPLOAD_BYTES * 2) {
      return NextResponse.json(
        {
          error: `Request too large (max ~${MAX_UPLOAD_BYTES / (1024 * 1024)} MB file).`,
        },
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

    const { text: corpus, truncated, fileKind } = await extractTextFromUpload(
      file,
      fileName
    );

    const textModel = getTextModel();
    const imageModel = getImageModel();

    let plannerOutput: string;
    let plannerNote: string;

    try {
      const plannerKey = getOpenRouterPlannerApiKey();
      plannerOutput = await openRouterChatText({
        apiKey: plannerKey,
        messages: [
          { role: "system", content: PROJECT_IMAGE_PLANNER_SYSTEM },
          {
            role: "user",
            content: projectImagePlannerUserMessage(corpus),
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });
      if (!plannerOutput.trim()) {
        throw new Error("Planner returned no text");
      }
      plannerOutput = plannerOutput.trim();
      plannerNote = plannerOutput;
    } catch (plannerErr) {
      const pmsg =
        plannerErr instanceof Error ? plannerErr.message : String(plannerErr);
      const pstatus = httpStatusFromOpenRouterError(pmsg);
      if (isOpenRouterRateOrQuotaError(pmsg, pstatus)) {
        const fp = fallbackImagePromptFromCorpus(corpus);
        return NextResponse.json({
          imageUrl: STATIC_IMAGE_PATH,
          imagePrompt: fp,
          plannerText:
            "OpenRouter hit a rate limit, quota, or credits/billing issue during planning; stock image shown.",
          textModel,
          imageModel: `${textModel} (planner) / ${imageModel} (OpenRouter limit → static)`,
          imageProvider: "static",
          truncated,
          fileKind,
          aspectRatio,
          usedStaticFallback: true,
          fallbackReason: "rate_limit",
        });
      }
      plannerOutput = fallbackImagePromptFromCorpus(corpus);
      plannerNote =
        "Used local heuristic prompt (OpenRouter planner did not return usable text).";
    }

    const imagePrompt = plannerOutput.trim();

    let dataUrl: string;
    try {
      dataUrl = await openRouterGenerateImage({
        prompt: imagePrompt,
        aspectRatio,
      });
    } catch (imgErr) {
      const msg =
        imgErr instanceof Error ? imgErr.message : String(imgErr);
      const status = httpStatusFromOpenRouterError(msg);
      if (isOpenRouterRateOrQuotaError(msg, status)) {
        return NextResponse.json({
          imageUrl: STATIC_IMAGE_PATH,
          imagePrompt,
          plannerText: plannerNote,
          textModel,
          imageModel: `${imageModel} (OpenRouter limit or credits → static placeholder)`,
          imageProvider: "static",
          truncated,
          fileKind,
          aspectRatio,
          usedStaticFallback: true,
          fallbackReason: "rate_limit",
        });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: dataUrl,
      imagePrompt,
      plannerText: plannerNote,
      textModel,
      imageModel,
      imageProvider: "openrouter",
      truncated,
      fileKind,
      aspectRatio,
      usedStaticFallback: false,
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
