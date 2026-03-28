import type { LoggedMeal } from "@/lib/types/meal";
import type { UserPlanProfile } from "@/lib/types/plan";

const MEALS_KEY = "fuelscan_meals_v1";
const PLAN_KEY = "fuelscan_plan_profile_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadMeals(): LoggedMeal[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MEALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as LoggedMeal[];
  } catch {
    return [];
  }
}

export function saveMeals(meals: LoggedMeal[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
}

export function appendMeal(meal: LoggedMeal): void {
  const meals = loadMeals();
  meals.unshift(meal);
  saveMeals(meals);
}

export function loadPlanProfile(): UserPlanProfile | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPlanProfile;
  } catch {
    return null;
  }
}

export function savePlanProfile(profile: UserPlanProfile): void {
  if (!isBrowser()) return;
  localStorage.setItem(PLAN_KEY, JSON.stringify(profile));
}

export function mealsForDayIsoDate(meals: LoggedMeal[], isoDate: string): LoggedMeal[] {
  const day = isoDate.slice(0, 10);
  return meals.filter((m) => m.loggedAt.slice(0, 10) === day);
}

export function sumMacros(meals: LoggedMeal[]): {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
