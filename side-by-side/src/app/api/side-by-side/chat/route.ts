import { NextRequest, NextResponse } from "next/server";
import {
  openRouterChatText,
} from "@/lib/openrouter-client";
import { SIDE_BY_SIDE_SYSTEM_PROMPT } from "@/lib/side-by-side-prompts";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function isValidContentPart(p: unknown): p is ContentPart {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (o.type === "text" && typeof o.text === "string") return true;
  if (o.type === "image_url" && o.image_url && typeof o.image_url === "object") {
    const u = (o.image_url as { url?: unknown }).url;
    return typeof u === "string" && u.startsWith("data:image/");
  }
  return false;
}

function normalizeMessage(msg: unknown): {
  role: "user" | "assistant";
  content: string | ContentPart[];
} | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  if (m.role !== "user" && m.role !== "assistant") return null;
  const c = m.content;
  if (typeof c === "string") return { role: m.role, content: c };
  if (Array.isArray(c)) {
    const parts = c.filter(isValidContentPart);
    if (parts.length === 0) return null;
    return { role: m.role, content: parts };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      documentContext?: unknown;
      messages?: unknown;
    };

    const documentContext =
      typeof body.documentContext === "string" ? body.documentContext : "";

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 }
      );
    }

    const normalized: Array<{
      role: "user" | "assistant";
      content: string | ContentPart[];
    }> = [];

    for (const raw of body.messages) {
      const n = normalizeMessage(raw);
      if (!n) {
        return NextResponse.json(
          { error: "Invalid message shape" },
          { status: 400 }
        );
      }
      normalized.push(n);
    }

    const systemBody =
      documentContext.trim().length > 0
        ? `${SIDE_BY_SIDE_SYSTEM_PROMPT}\n\n--- Document excerpt (may be truncated) ---\n${documentContext.trim()}`
        : `${SIDE_BY_SIDE_SYSTEM_PROMPT}\n\n(No document text was extracted yet; answer from conversation and any images the user sends.)`;

    const reply = await openRouterChatText({
      messages: [
        { role: "system", content: systemBody },
        ...normalized,
      ],
      temperature: 0.5,
      max_tokens: 4096,
    });

    return NextResponse.json({ reply });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
