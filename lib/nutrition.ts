import type { Activity, DailyTargets, Goal, Sex, UserPlanProfile } from "@/lib/types/plan";

const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Mifflin–St Jeor BMR; TDEE = BMR * activity multiplier. */
export function estimateTdee(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activity: Activity,
): number {
  const base =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  return Math.round(base * ACTIVITY_MULT[activity]);
}

function goalCalorieDelta(goal: Goal): number {
  switch (goal) {
    case "lose":
      return -500;
    case "gain":
      return 300;
    default:
      return 0;
  }
}

export function computeDailyTargets(profile: UserPlanProfile): DailyTargets {
  const tdee = estimateTdee(
    profile.weightKg,
    profile.heightCm,
    profile.age,
    profile.sex,
    profile.activity,
  );
  const calories = Math.max(1200, tdee + goalCalorieDelta(profile.goal));
  const proteinG = Math.round(profile.weightKg * profile.proteinGPerKg);
  const proteinKcal = proteinG * 4;
  const remaining = Math.max(0, calories - proteinKcal);
  const fatG = Math.round((remaining * 0.35) / 9);
  const fatKcal = fatG * 9;
  const carbsG = Math.round(Math.max(0, calories - proteinKcal - fatKcal) / 4);

  return {
    tdee,
    calories,
    proteinG,
    carbsG,
    fatG,
  };
}

export type MealSlot = { label: string; calories: number; idea: string };

/** Rough meal template for demo — not a prescription. */
export function suggestMealTemplate(targets: DailyTargets): MealSlot[] {
  const c = targets.calories;
  return [
    {
      label: "Breakfast",
      calories: Math.round(c * 0.25),
      idea: "Protein + fruit + whole grain (e.g. Greek yogurt, berries, oats).",
    },
    {
      label: "Lunch",
      calories: Math.round(c * 0.35),
      idea: "Lean protein, vegetables, complex carbs (e.g. chicken salad + quinoa).",
    },
    {
      label: "Snack",
      calories: Math.round(c * 0.1),
      idea: "Protein-forward snack (e.g. cottage cheese, apple, nuts — watch portions).",
    },
    {
      label: "Dinner",
      calories: Math.round(c * 0.3),
      idea: "Protein + two vegetable sides; adjust starch to hit remaining carbs.",
    },
  ];
}
