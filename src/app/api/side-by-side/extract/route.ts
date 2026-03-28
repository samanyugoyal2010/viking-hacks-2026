import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

const MAX_CHARS = 32_000;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing file (multipart field: file)" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    let text = "";
    try {
      const result = await parser.getText();
      text = result.text ?? "";
    } finally {
      await parser.destroy();
    }

    const truncated = text.length > MAX_CHARS;
    const excerpt = truncated ? text.slice(0, MAX_CHARS) : text;

    return NextResponse.json({
      text: excerpt,
      truncated,
      totalLength: text.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
