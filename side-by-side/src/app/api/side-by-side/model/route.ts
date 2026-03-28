import { NextResponse } from "next/server";
import { getTextModel } from "@/lib/openrouter-client";

export async function GET() {
  return NextResponse.json({ model: getTextModel() });
}
