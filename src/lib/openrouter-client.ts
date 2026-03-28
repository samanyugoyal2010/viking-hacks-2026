export const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export const DEFAULT_OPENROUTER_TEXT_MODEL =
  "nvidia/nemotron-nano-12b-v2-vl:free";

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

export function getOpenRouterApiKey(): string {
  const key = normalizeApiKey(process.env.OPENROUTER_API_KEY ?? "");
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to side-by-side/.env.local (no quotes)."
    );
  }
  return key;
}

export function openRouterHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    "Content-Type": "application/json",
  };
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    "http://127.0.0.1:3001";
  headers["HTTP-Referer"] = referer;

  const title =
    process.env.OPENROUTER_APP_TITLE?.trim() || "Side-by-side PDF Chat";
  headers["X-Title"] = title;
  headers["X-OpenRouter-Title"] = title;

  return headers;
}

function formatOpenRouterHttpError(
  data: Record<string, unknown>,
  status: number,
  raw: string
): string {
  const errUnknown = data.error;
  let message: string;
  if (typeof errUnknown === "string") {
    message = errUnknown;
  } else if (
    errUnknown &&
    typeof errUnknown === "object" &&
    "message" in errUnknown
  ) {
    message = String((errUnknown as { message: string }).message);
  } else {
    message = raw.slice(0, 400);
  }

  const hint401 =
    "OpenRouter rejected the API key. See https://openrouter.ai/keys and set OPENROUTER_API_KEY in side-by-side/.env.local.";

  if (status === 401) {
    return `${message}. ${hint401}`;
  }
  const m = message.toLowerCase();
  if (m.includes("user not found") || m.includes("invalid api key")) {
    return `${message}. ${hint401}`;
  }
  return message;
}

export function getTextModel(): string {
  return (
    process.env.OPENROUTER_TEXT_MODEL?.trim() || DEFAULT_OPENROUTER_TEXT_MODEL
  );
}

export function assistantTextFromResponse(
  data: Record<string, unknown>
): string {
  const choices = data.choices as
    | Array<{ message?: { content?: unknown } }>
    | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

export async function openRouterComplete(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `OpenRouter returned non-JSON (${res.status}): ${raw.slice(0, 280)}`
    );
  }
  if (!res.ok) {
    throw new Error(formatOpenRouterHttpError(data, res.status, raw));
  }
  return data;
}

type Message = {
  role: "system" | "user" | "assistant";
  content: string | unknown[];
};

export async function openRouterChatText(params: {
  model?: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: params.model ?? getTextModel(),
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
  };
  if (params.max_tokens != null) body.max_tokens = params.max_tokens;
  const data = await openRouterComplete(body);
  return assistantTextFromResponse(data);
}
