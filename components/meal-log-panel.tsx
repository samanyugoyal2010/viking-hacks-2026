"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { compressImageFile } from "@/lib/image";
import type { LoggedMeal, MealAnalysis } from "@/lib/types/meal";
import {
  appendMeal,
  loadMeals,
  mealsForDayIsoDate,
  sumMacros,
} from "@/lib/storage";
import { MedicalDisclaimer } from "@/components/disclaimer";

type Phase = "capture" | "review" | "done";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MealLogPanel() {
  const [phase, setPhase] = useState<Phase>("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealAnalysis | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [todayMeals, setTodayMeals] = useState<LoggedMeal[]>([]);

  useEffect(() => {
    const all = loadMeals();
    setTodayMeals(mealsForDayIsoDate(all, todayIso()));
  }, [refresh]);

  const todayTotals = useMemo(() => sumMacros(todayMeals), [todayMeals]);

  const revokePreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    revokePreview();
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setFile(f);
    setPhase("capture");
    setDraft(null);
  };

  const analyze = async () => {
    if (!file) {
      setError("Choose or capture a photo first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const blob = await compressImageFile(file);
      const fd = new FormData();
      fd.append("image", blob, "meal.jpg");
      const res = await fetch("/api/analyze-meal", { method: "POST", body: fd });
      const data = (await res.json()) as {
        analysis?: MealAnalysis;
        error?: string;
        detail?: string;
        raw?: string;
      };
      if (!res.ok) {
        const parts = [data.error || "Analysis failed"];
        if (data.detail) parts.push(data.detail);
        if (data.raw && process.env.NODE_ENV === "development")
          parts.push(`Raw: ${data.raw.slice(0, 200)}…`);
        throw new Error(parts.join(" — "));
      }
      if (!data.analysis) throw new Error("No analysis returned");
      setDraft(data.analysis);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const saveLog = () => {
    if (!draft) return;
    const entry: LoggedMeal = {
      ...draft,
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
    };
    appendMeal(entry);
    setRefresh((n) => n + 1);
    setPhase("done");
    setDraft(null);
    revokePreview();
    setPreviewUrl(null);
    setFile(null);
  };

  const reset = () => {
    revokePreview();
    setPreviewUrl(null);
    setFile(null);
    setDraft(null);
    setPhase("capture");
    setError(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-28 pt-4 safe-area-pb">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Log a meal
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Photo uploads go to our server; your OpenAI key stays server-side only.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Today so far
        </h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
          {Math.round(todayTotals.calories)}{" "}
          <span className="text-base font-normal text-zinc-500">kcal</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          P {Math.round(todayTotals.proteinG)}g · C {Math.round(todayTotals.carbsG)}
          g · F {Math.round(todayTotals.fatG)}g · {todayMeals.length} meals
        </p>
      </section>

      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/50 px-4 py-10 text-center dark:border-emerald-700 dark:bg-emerald-950/30">
          <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            Tap to take or choose a photo
          </span>
          <span className="mt-1 text-xs text-zinc-500">
            Uses camera on supported phones
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onFileChange}
          />
        </label>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic blob URLs
          <img
            src={previewUrl}
            alt="Meal preview"
            className="max-h-64 w-full rounded-xl object-cover"
          />
        )}

        {error && (
          <p
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        )}

        {phase === "capture" && (
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={!file || loading}
            className="min-h-12 rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Estimate nutrition"}
          </button>
        )}

        {phase === "review" && draft && (
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Review & edit
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Food name</span>
              <input
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
                value={draft.foodName}
                onChange={(e) =>
                  setDraft({ ...draft, foodName: e.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Portion</span>
              <input
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
                value={draft.portionDescription}
                onChange={(e) =>
                  setDraft({ ...draft, portionDescription: e.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <MacroInput
                label="Calories"
                value={draft.calories}
                onChange={(n) => setDraft({ ...draft, calories: n })}
              />
              <MacroInput
                label="Protein (g)"
                value={draft.proteinG}
                onChange={(n) => setDraft({ ...draft, proteinG: n })}
              />
              <MacroInput
                label="Carbs (g)"
                value={draft.carbsG}
                onChange={(n) => setDraft({ ...draft, carbsG: n })}
              />
              <MacroInput
                label="Fat (g)"
                value={draft.fatG}
                onChange={(n) => setDraft({ ...draft, fatG: n })}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Model confidence: {(draft.confidence * 100).toFixed(0)}% — always
              verify before logging.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveLog}
                className="min-h-12 flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Save to log
              </button>
              <button
                type="button"
                onClick={reset}
                className="min-h-12 rounded-xl border border-zinc-300 px-4 py-3 font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
            <p className="font-medium">Saved.</p>
            <button
              type="button"
              onClick={() => setPhase("capture")}
              className="mt-3 text-sm font-semibold underline"
            >
              Log another meal
            </button>
          </div>
        )}
      </div>

      {todayMeals.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Today&apos;s entries
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {todayMeals.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="truncate pr-2 font-medium">{m.foodName}</span>
                <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
                  {m.calories} kcal
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MedicalDisclaimer />
    </div>
  );
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        type="number"
        min={0}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 tabular-nums dark:border-zinc-600 dark:bg-zinc-950"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </label>
  );
}
