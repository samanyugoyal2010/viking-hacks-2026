import Link from "next/link";
import { MedicalDisclaimer } from "@/components/disclaimer";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-100">
          Hackathon MVP
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">
          Snap a meal. See macros. Stay on plan.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-emerald-50/95">
          FuelScan uses a server-side vision model (your API key never ships to
          the browser) and stores logs locally on your phone.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/log"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-center text-base font-semibold text-emerald-800 shadow-sm"
          >
            Log a meal
          </Link>
          <Link
            href="/plan"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 px-5 py-3 text-center text-base font-semibold text-white"
          >
            Build my plan
          </Link>
        </div>
      </div>

      <section className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Why judges care
        </h2>
        <ul className="list-inside list-disc space-y-2">
          <li>
            <strong className="text-zinc-800 dark:text-zinc-200">Security:</strong>{" "}
            OpenAI key only on the server (Route Handler BFF).
          </li>
          <li>
            <strong className="text-zinc-800 dark:text-zinc-200">Trust:</strong>{" "}
            Editable estimates, medical disclaimer, local-only profile data.
          </li>
          <li>
            <strong className="text-zinc-800 dark:text-zinc-200">Mobile:</strong>{" "}
            Camera capture, large tap targets, safe-area friendly layout.
          </li>
        </ul>
      </section>

      <MedicalDisclaimer />
    </div>
  );
}
