"use client";

import dynamic from "next/dynamic";

const SideBySideClient = dynamic(
  () => import("./side-by-side-client"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-[#fafafa] text-zinc-500 text-sm">
        <span className="inline-block h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        Loading PDF viewer…
      </div>
    ),
  }
);

export default function PdfChatShell() {
  return <SideBySideClient />;
}
