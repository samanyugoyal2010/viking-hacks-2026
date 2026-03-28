"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  computeDailyTargets,
  suggestMealTemplate,
} from "@/lib/nutrition";
import type { Activity, Goal, Sex, UserPlanProfile } from "@/lib/types/plan";
import {
  loadMeals,
  loadPlanProfile,
  mealsForDayIsoDate,
  savePlanProfile,
  sumMacros,
} from "@/lib/storage";
import { MedicalDisclaimer } from "@/components/disclaimer";
import Link from "next/link";

const defaultProfile: UserPlanProfile = {
  age: 28,
  sex: "male",
  heightCm: 175,
  weightKg: 72,
  activity: "moderate",
  goal: "maintain",
  proteinGPerKg: 1.6,
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PlanPanel() {
  const [profile, setProfile] = useState<UserPlanProfile>(defaultProfile);
  const [savedFlash, setSavedFlash] = useState(false);
  const [todayLogged, setTodayLogged] = useState({
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  });

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadPlanProfile() ?? defaultProfile);
      const meals = mealsForDayIsoDate(loadMeals(), todayIso());
      setTodayLogged(sumMacros(meals));
    });
  }, []);

  const targets = useMemo(() => computeDailyTargets(profile), [profile]);
  const template = useMemo(() => suggestMealTemplate(targets), [targets]);

  const save = () => {
    savePlanProfile(profile);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const calRemaining = Math.max(0, targets.calories - todayLogged.calories);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-28 pt-4 safe-area-pb">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Nutrition plan
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          TDEE via Mifflin–St Jeor; calorie target adjusted for your goal. Stored
          only on this device.
        </p>
      </div>

      <form
        className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input
              type="number"
              min={14}
              max={100}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={profile.age}
              onChange={(e) =>
                setProfile({ ...profile, age: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Sex (formula)">
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={profile.sex}
              onChange={(e) =>
                setProfile({ ...profile, sex: e.target.value as Sex })
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Height (cm)">
            <input
              type="number"
              min={100}
              max={230}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={profile.heightCm}
              onChange={(e) =>
                setProfile({ ...profile, heightCm: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              min={35}
              max={250}
              step={0.1}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={profile.weightKg}
              onChange={(e) =>
                setProfile({ ...profile, weightKg: Number(e.target.value) || 0 })
              }
            />
          </Field>
        </div>
        <Field label="Activity">
          <select
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            value={profile.activity}
            onChange={(e) =>
              setProfile({ ...profile, activity: e.target.value as Activity })
            }
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
          </select>
        </Field>
        <Field label="Goal">
          <select
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            value={profile.goal}
            onChange={(e) =>
              setProfile({ ...profile, goal: e.target.value as Goal })
            }
          >
            <option value="lose">Lose weight (~500 kcal deficit)</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Gain (~300 kcal surplus)</option>
          </select>
        </Field>
        <Field label="Protein (g per kg bodyweight)">
          <input
            type="number"
            min={0.8}
            max={2.5}
            step={0.1}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            value={profile.proteinGPerKg}
            onChange={(e) =>
              setProfile({
                ...profile,
                proteinGPerKg: Number(e.target.value) || 1.2,
              })
            }
          />
        </Field>
        <button
          type="submit"
          className="min-h-12 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          {savedFlash ? "Saved locally" : "Save profile"}
        </button>
      </form>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your targets
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-zinc-500">Estimated TDEE</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {targets.tdee} kcal
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Daily target</dt>
            <dd className="text-lg font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
              {targets.calories} kcal
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Protein</dt>
            <dd className="tabular-nums">{targets.proteinG} g</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Carbs</dt>
            <dd className="tabular-nums">{targets.carbsG} g</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-zinc-500">Fat (remaining budget)</dt>
            <dd className="tabular-nums">{targets.fatG} g</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <h2 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
          Today vs plan
        </h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Logged{" "}
          <span className="font-semibold tabular-nums">
            {Math.round(todayLogged.calories)}
          </span>{" "}
          kcal · roughly{" "}
          <span className="font-semibold tabular-nums">
            {Math.round(calRemaining)}
          </span>{" "}
          kcal left vs calorie target.
        </p>
        <Link
          href="/log"
          className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline dark:text-emerald-300"
        >
          Go log a meal
        </Link>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Suggested day structure
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Illustrative only — adjust to your culture, budget, and preferences.
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {template.map((slot) => (
            <li
              key={slot.label}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{slot.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  ~{slot.calories} kcal
                </span>
              </div>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {slot.idea}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <MedicalDisclaimer />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
