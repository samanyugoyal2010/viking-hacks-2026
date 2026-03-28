import Link from "next/link";

const link =
  "rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-zinc-300 dark:hover:text-emerald-200";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-emerald-800 dark:text-emerald-300"
        >
          FuelScan
        </Link>
        <nav className="flex gap-1">
          <Link href="/log" className={link}>
            Log meal
          </Link>
          <Link href="/plan" className={link}>
            Plan
          </Link>
        </nav>
      </div>
    </header>
  );
}
