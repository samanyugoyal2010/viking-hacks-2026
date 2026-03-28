import { DIAGRAM_VISUALIZER_SYSTEM_PROMPT } from "./prompts";
import {
  getImageModel,
  openRouterComplete,
} from "./openrouter-client";

function parseBase64FromMessage(message: Record<string, unknown>): string | null {
  const content = message.content;

  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      const inline = p.inline_data as { data?: string } | undefined;
      if (inline?.data) return inline.data;

      if (p.type === "image_url") {
        const url = (p.image_url as { url?: string } | undefined)?.url;
        if (url?.startsWith("data:")) {
          const comma = url.indexOf(",");
          if (comma !== -1) return url.slice(comma + 1);
        }
      }
    }
  }

  const images = message.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0] as Record<string, unknown> | string;
    if (typeof first === "object" && first !== null) {
      const url = (first.image_url as { url?: string } | undefined)?.url ?? "";
      if (url.startsWith("data:")) {
        const comma = url.indexOf(",");
        if (comma !== -1) return url.slice(comma + 1);
      }
      if (url && !url.startsWith("data:")) {
        return url;
      }
    } else if (typeof first === "string" && first.startsWith("data:image")) {
      const comma = first.indexOf(",");
      if (comma !== -1) return first.slice(comma + 1);
    }
  }

  if (typeof content === "string" && content.startsWith("data:image")) {
    const comma = content.indexOf(",");
    if (comma !== -1) return content.slice(comma + 1);
  }

  return null;
}

export async function generateDiagramViaOpenRouter(
  userPrompt: string,
  aspectRatio: string,
  onStep: (step: string) => void,
  options?: { maxAttempts?: number; retryDelayMs?: number }
): Promise<string | null> {
  const model = getImageModel();
  const maxAttempts = options?.maxAttempts ?? 4;
  const retryDelayMs = options?.retryDelayMs ?? 12_000;

  const userContent = [{ type: "text" as const, text: userPrompt }];

  const isImageOnlyModel =
    model.startsWith("sourceful/") ||
    model.startsWith("black-forest-labs/") ||
    model.startsWith("bytedance-seed/") ||
    model.includes("flux") ||
    model.includes("seedream");

  const payload: Record<string, unknown> = {
    model,
    messages: [
      ...(isImageOnlyModel
        ? []
        : [{ role: "system", content: DIAGRAM_VISUALIZER_SYSTEM_PROMPT }]),
      { role: "user", content: isImageOnlyModel ? userPrompt : userContent },
    ],
    temperature: 0.8,
    modalities: isImageOnlyModel ? ["image"] : ["image", "text"],
    image_config: {
      aspect_ratio: aspectRatio || "16:9",
      image_size: "1k",
    },
  };

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onStep(
      `Visualizer (OpenRouter / ${model}): generating diagram… (attempt ${attempt}/${maxAttempts})`
    );

    try {
      const data = await openRouterComplete(payload);

      const choices = data.choices as Array<Record<string, unknown>> | undefined;
      const message = choices?.[0]?.message as
        | Record<string, unknown>
        | undefined;
      if (!message) {
        lastError = "OpenRouter returned no choices";
        if (attempt < maxAttempts) await sleep(retryDelayMs);
        continue;
      }

      const b64 = parseBase64FromMessage(message);
      if (b64) return b64;

      lastError =
        "Model response had no image (check that this model supports image output on OpenRouter)";
      if (attempt < maxAttempts) await sleep(retryDelayMs);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt < maxAttempts) await sleep(retryDelayMs);
    }
  }

  throw new Error(
    `OpenRouter image generation failed after ${maxAttempts} attempts. Last error: ${lastError}`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
