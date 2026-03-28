import { NextRequest } from "next/server";
import { runFullPipeline } from "@/lib/gemini";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const body = await req.json();
  const { pdfBase64, caption, aspectRatio, criticRounds } = body as {
    pdfBase64: string;
    caption?: string;
    aspectRatio?: string;
    criticRounds?: number;
  };

  if (!pdfBase64) {
    return new Response(JSON.stringify({ error: "No PDF provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
        );
      }

      try {
        const result = await runFullPipeline(
          pdfBase64,
          caption,
          aspectRatio ?? "16:9",
          criticRounds ?? 1,
          (step: string) => sendEvent("step", step)
        );

        sendEvent("result", result);
      } catch (err) {
        sendEvent("error", {
          message:
            err instanceof Error ? err.message : "An unknown error occurred",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
