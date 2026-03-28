const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

/** Prompt limits by model family */
const DALLE3_MAX_PROMPT_CHARS = 4000;
const GPT_IMAGE_MAX_PROMPT_CHARS = 8000;

export const DEFAULT_OPENAI_IMAGE_MODEL =
  "gpt-image-1.5-2025-12-16";

function normalizeApiKey(raw: string): string {
  let k = raw.trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

export function getOpenAiApiKey(): string | null {
  const k = normalizeApiKey(process.env.OPENAI_API_KEY ?? "");
  return k || null;
}

export function getOpenAiImageModel(): string {
  return (
    process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_IMAGE_MODEL
  );
}

/**
 * Map UI aspect ratio to DALL·E 3 supported sizes (only three options).
 */
export function openAiImageSizeForDalle3(
  aspectRatio: string
): "1024x1024" | "1792x1024" | "1024x1792" {
  const portraitish = new Set([
    "9:16",
    "2:3",
    "3:4",
    "4:5",
    "1:4",
    "1:8",
  ]);
  const squareish = new Set(["1:1"]);

  if (squareish.has(aspectRatio)) return "1024x1024";
  if (portraitish.has(aspectRatio)) return "1024x1792";
  return "1792x1024";
}

/**
 * Map UI aspect ratio to GPT Image family sizes (OpenAI docs).
 */
export function openAiImageSizeForGptImage(
  aspectRatio: string
): "1024x1024" | "1536x1024" | "1024x1536" | "auto" {
  const portraitish = new Set([
    "9:16",
    "2:3",
    "3:4",
    "4:5",
    "1:4",
    "1:8",
  ]);
  const squareish = new Set(["1:1"]);

  if (squareish.has(aspectRatio)) return "1024x1024";
  if (portraitish.has(aspectRatio)) return "1024x1536";
  return "1536x1024";
}

type OpenAiImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

/**
 * Generate one image via OpenAI Images API; returns a PNG data URL.
 */
export async function openAiGenerateImage(params: {
  prompt: string;
  aspectRatio: string;
}): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or .env.local for OpenAI image generation."
    );
  }

  const model = getOpenAiImageModel();
  const m = model.toLowerCase();

  const maxPrompt = m.includes("gpt-image")
    ? GPT_IMAGE_MAX_PROMPT_CHARS
    : DALLE3_MAX_PROMPT_CHARS;
  const prompt = params.prompt.slice(0, maxPrompt).trim();
  if (!prompt) {
    throw new Error("Image prompt is empty after truncation.");
  }

  let size: string;
  if (model === "dall-e-2") {
    size = "1024x1024";
  } else if (model === "dall-e-3") {
    size = openAiImageSizeForDalle3(params.aspectRatio);
  } else if (m.includes("gpt-image")) {
    size = openAiImageSizeForGptImage(params.aspectRatio);
  } else {
    throw new Error(
      `OPENAI_IMAGE_MODEL=${model} is not supported. Use gpt-image-*, dall-e-3, or dall-e-2.`
    );
  }

  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size,
    response_format: "b64_json",
  };

  if (model === "dall-e-3") {
    body.quality = "hd";
  }

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: OpenAiImageResponse;
  try {
    data = JSON.parse(raw) as OpenAiImageResponse;
  } catch {
    throw new Error(
      `OpenAI returned non-JSON (${res.status}): ${raw.slice(0, 280)}`
    );
  }

  if (!res.ok) {
    const msg =
      data.error?.message ||
      raw.slice(0, 400) ||
      `OpenAI images error (${res.status})`;
    throw new Error(msg);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }

  const url = data.data?.[0]?.url;
  if (url) {
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      throw new Error("OpenAI returned an image URL that could not be fetched.");
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  }

  throw new Error("OpenAI returned no image data (b64_json or url).");
}

export function isOpenAiImageConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}
