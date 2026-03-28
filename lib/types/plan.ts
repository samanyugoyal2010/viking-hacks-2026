export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export type UserPlanProfile = {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  proteinGPerKg: number;
};

export type DailyTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  tdee: number;
};
