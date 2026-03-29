"use client";

import dynamic from "next/dynamic";
import { PrismGradientBg } from "@/components/research-os/prism-gradient-bg";

const SideBySideClient = dynamic(
  () => import("./side-by-side-client"),
  {
    ssr: false,
    loading: () => (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 bg-[#030303] text-sm text-zinc-400">
        <PrismGradientBg />
        <span className="relative z-10 inline-block h-7 w-7 animate-spin rounded-full border-2 border-sky-400/60 border-t-transparent" />
        <span className="relative z-10">Loading PDF viewer…</span>
      </div>
    ),
  }
);

export default function PdfChatShell() {
  return <SideBySideClient />;
}
