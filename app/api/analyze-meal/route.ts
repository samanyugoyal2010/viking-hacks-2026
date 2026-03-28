import { NextResponse } from "next/server";
import type { MealAnalysis } from "@/lib/types/meal";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** First `{` … matching `}` outside of strings — avoids broken lastIndexOf("}") on nested content. */
function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function num(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return NaN;
}

function str(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function parseMealAnalysisJson(text: string): MealAnalysis | null {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const balanced = extractBalancedJsonObject(unfenced) ?? extractBalancedJsonObject(trimmed);
  const candidates = [balanced ?? "", unfenced, trimmed].filter(Boolean);

  for (const chunk of candidates) {
    try {
      const raw = JSON.parse(chunk) as Record<string, unknown>;
      const foodName = str(raw, "foodName", "food_name", "name") || "Unknown meal";
      const c = num(raw, "confidence");
      const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0.5;
      const calories = Math.max(0, Math.round(num(raw, "calories", "calories_kcal", "kcal") || 0));
      const proteinG = Math.max(0, Math.round(num(raw, "proteinG", "protein_g", "protein") || 0));
      const carbsG = Math.max(0, Math.round(num(raw, "carbsG", "carbs_g", "carbs", "carbohydrates_g") || 0));
      const fatG = Math.max(0, Math.round(num(raw, "fatG", "fat_g", "fat") || 0));
      const portionDescription =
        str(raw, "portionDescription", "portion_description", "portion") || "Typical serving";
      const notesRaw = str(raw, "notes", "note");
      const notes = notesRaw || undefined;

      return {
        foodName,
        confidence,
        calories,
        proteinG,
        carbsG,
        fatG,
        portionDescription,
        notes,
      };
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function summarizeOpenAiError(body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string; code?: string } };
    const msg = j.error?.message;
    if (msg) return msg;
  } catch {
    /* ignore */
  }
  return body.slice(0, 400);
}

type VisionProvider = {
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  extraHeaders: Record<string, string>;
};

function resolveVisionProvider(): VisionProvider | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    const base =
      process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1";
    const model =
      process.env.OPENROUTER_MODEL?.trim() ||
      "nvidia/nemotron-nano-12b-v2-vl:free";
    const referer =
      process.env.OPENROUTER_HTTP_REFERER?.trim() ||
      (process.env.VERCEL_URL?.trim()
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    return {
      label: "OpenRouter",
      apiKey: openRouterKey,
      baseUrl: base.replace(/\/$/, ""),
      model,
      extraHeaders: {
        "HTTP-Referer": referer,
        "X-Title": "FuelScan",
      },
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    const base =
      process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
    const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
    return {
      label: "OpenAI",
      apiKey: openAiKey,
      baseUrl: base.replace(/\/$/, ""),
      model,
      extraHeaders: {},
    };
  }

  return null;
}

async function callChatCompletionsVision(
  provider: VisionProvider,
  dataUrl: string,
  useJsonObjectFormat: boolean,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const systemPrompt = `You are a nutrition assistant. Given a meal photo, estimate ONE primary dish (or combined plate) and plausible macros for a typical adult portion.
Respond with a single JSON object only (no markdown, no prose before or after) with keys: foodName (string), confidence (0-1 number), calories (number), proteinG, carbsG, fatG (grams, numbers), portionDescription (max 12 words), notes (optional string, max one short sentence).
Use straight double quotes in JSON only. If unsure, lower confidence. Never invent brand names you cannot read.`;

  const body: Record<string, unknown> = {
    model: provider.model,
    temperature: 0.2,
    max_tokens: 2048,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this meal photo and respond with JSON only as specified.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ] satisfies OpenAIContentPart[],
      },
    ],
  };

  if (useJsonObjectFormat) {
    body.response_format = { type: "json_object" };
  }

  const url = `${provider.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
      ...provider.extraHeaders,
    },
    body: JSON.stringify(body),
  });

  const resText = await res.text();

  if (!res.ok) {
    return { ok: false, status: res.status, body: resText };
  }

  let json: {
    choices?: {
      message?: { content?: unknown; refusal?: string | null };
      finish_reason?: string;
    }[];
  };
  try {
    json = JSON.parse(resText) as typeof json;
  } catch {
    return {
      ok: false,
      status: 502,
      body: `Invalid JSON from ${provider.label}`,
    };
  }

  const choice = json.choices?.[0];
  const refusal = choice?.message?.refusal;
  if (typeof refusal === "string" && refusal.trim()) {
    return { ok: false, status: 502, body: refusal.trim() };
  }

  const text = normalizeMessageContent(choice?.message?.content);
  if (!text && choice?.finish_reason === "length") {
    return {
      ok: false,
      status: 502,
      body: "Model hit token limit with no content. Try a smaller image.",
    };
  }
  if (!text) {
    return {
      ok: false,
      status: 502,
      body: `Empty model content (finish_reason=${choice?.finish_reason ?? "unknown"})`,
    };
  }

  return { ok: true, text };
}

export async function POST(request: Request) {
  const provider = resolveVisionProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: set OPENAI_API_KEY (OpenAI) or OPENROUTER_API_KEY (OpenRouter) in .env.local.",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: "Missing image file under field 'image'." }, { status: 400 });
  }

  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 4MB)." }, { status: 400 });
  }

  const mime = image.type || "image/jpeg";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  let result = await callChatCompletionsVision(provider, dataUrl, true);
  if (!result.ok && result.status === 400) {
    const hint = summarizeOpenAiError(result.body);
    if (/response_format|json_object|unsupported/i.test(hint)) {
      result = await callChatCompletionsVision(provider, dataUrl, false);
    }
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: `Upstream vision API failed (${provider.label}).`,
        detail: summarizeOpenAiError(result.body),
      },
      { status: 502 },
    );
  }

  const parsed = parseMealAnalysisJson(result.text);
  if (!parsed) {
    return NextResponse.json(
      {
        error: "Could not parse model output.",
        detail: "Expected a JSON object with foodName and macro fields.",
        raw: result.text.slice(0, 1200),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ analysis: parsed } satisfies { analysis: MealAnalysis });
}
