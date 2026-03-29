export type ResearchAccent = "sky" | "violet" | "emerald" | "rose";

export const ACCENT_THEMES: Record<
  ResearchAccent,
  {
    gradient: string;
    accentHex: string;
    iconBorder: string;
    iconGlow: string;
    primaryBtn: string;
    userBubble: string;
    focusRing: string;
    dropzoneActive: string;
    dropzoneIdle: string;
    subtleLink: string;
  }
> = {
  sky: {
    gradient: "linear-gradient(to left, #38bdf8 0%, #06b6d4 100%)",
    accentHex: "#7dd3fc",
    iconBorder: "border-sky-400/40",
    iconGlow: "shadow-[0_0_28px_-8px_rgba(56,189,248,0.55)]",
    primaryBtn:
      "bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white border border-sky-400/30",
    userBubble: "bg-sky-600/95 text-white border border-sky-400/35 shadow-lg shadow-sky-950/40",
    focusRing: "focus:ring-2 focus:ring-sky-400/35 focus:outline-none",
    dropzoneActive: "border-sky-400/70 bg-sky-500/15",
    dropzoneIdle: "border-white/20 bg-black/40 hover:border-sky-400/45",
    subtleLink: "text-sky-400 hover:text-sky-300",
  },
  violet: {
    gradient: "linear-gradient(to left, #c084fc 0%, #e879f9 100%)",
    accentHex: "#e9d5ff",
    iconBorder: "border-violet-400/40",
    iconGlow: "shadow-[0_0_28px_-8px_rgba(167,139,250,0.55)]",
    primaryBtn:
      "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white border border-violet-400/30",
    userBubble:
      "bg-violet-600/95 text-white border border-violet-400/35 shadow-lg shadow-violet-950/40",
    focusRing: "focus:ring-2 focus:ring-violet-400/35 focus:outline-none",
    dropzoneActive: "border-violet-400/70 bg-violet-500/15",
    dropzoneIdle: "border-white/20 bg-black/40 hover:border-violet-400/45",
    subtleLink: "text-violet-400 hover:text-violet-300",
  },
  emerald: {
    gradient: "linear-gradient(to left, #34d399 0%, #14b8a6 100%)",
    accentHex: "#6ee7b7",
    iconBorder: "border-emerald-400/40",
    iconGlow: "shadow-[0_0_28px_-8px_rgba(52,211,153,0.5)]",
    primaryBtn:
      "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border border-emerald-400/30",
    userBubble:
      "bg-emerald-600/95 text-white border border-emerald-400/35 shadow-lg shadow-emerald-950/40",
    focusRing: "focus:ring-2 focus:ring-emerald-400/35 focus:outline-none",
    dropzoneActive: "border-emerald-400/70 bg-emerald-500/15",
    dropzoneIdle: "border-white/20 bg-black/40 hover:border-emerald-400/45",
    subtleLink: "text-emerald-400 hover:text-emerald-300",
  },
  rose: {
    gradient: "linear-gradient(to left, #fb7185 0%, #fb923c 100%)",
    accentHex: "#fda4af",
    iconBorder: "border-rose-400/40",
    iconGlow: "shadow-[0_0_28px_-8px_rgba(251,113,133,0.5)]",
    primaryBtn:
      "bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white border border-rose-400/30",
    userBubble:
      "bg-rose-600/95 text-white border border-rose-400/35 shadow-lg shadow-rose-950/40",
    focusRing: "focus:ring-2 focus:ring-rose-400/35 focus:outline-none",
    dropzoneActive: "border-rose-400/70 bg-rose-500/15",
    dropzoneIdle: "border-white/20 bg-black/40 hover:border-rose-400/45",
    subtleLink: "text-rose-400 hover:text-rose-300",
  },
};
