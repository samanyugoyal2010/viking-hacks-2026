import Link from "next/link";
import {
  FileText,
  FolderArchive,
  Image as ImageIcon,
  MessageCircle,
  Clapperboard,
} from "lucide-react";

export default function MainHubPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
              Research workspace
            </h1>
            <p className="text-sm text-zinc-500">
              Choose how you want to work with your materials
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/side-by-side"
            className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm hover:border-sky-300 hover:shadow-md transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 mb-4 group-hover:bg-sky-200/80">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">
              Side-by-side PDF chat
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Upload a PDF, highlight passages, capture page screenshots, and
              chat with an assistant that reads your document.
            </p>
            <span className="inline-block mt-4 text-sm font-medium text-sky-700 group-hover:underline">
              Open →
            </span>
          </Link>

          <Link
            href="/explain-research"
            className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm hover:border-violet-300 hover:shadow-md transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 mb-4 group-hover:bg-violet-200/80">
              <FolderArchive className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">
              Explain Research
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Upload a ZIP export and explore what&apos;s inside with a guided
              assistant.
            </p>
            <span className="inline-block mt-4 text-sm font-medium text-violet-700 group-hover:underline">
              Open →
            </span>
          </Link>

          <Link
            href="/image"
            className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4 group-hover:bg-emerald-200/80">
              <ImageIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">
              Project explainer image
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Upload a PDF, ZIP, or text file and generate one diagram-style
              image that summarizes the whole project.
            </p>
            <span className="inline-block mt-4 text-sm font-medium text-emerald-700 group-hover:underline">
              Open →
            </span>
          </Link>

          <Link
            href="/video"
            className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm hover:border-rose-300 hover:shadow-md transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 mb-4 group-hover:bg-rose-200/80">
              <Clapperboard className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">
              Video generation
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Turn research notes into a short explainer-style video preview
              using our template clip.
            </p>
            <span className="inline-block mt-4 text-sm font-medium text-rose-700 group-hover:underline">
              Open →
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
