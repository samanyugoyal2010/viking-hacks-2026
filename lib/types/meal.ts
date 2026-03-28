/** Stable contract between BFF and client (normalize provider output here). */
export type MealAnalysis = {
  foodName: string;
  confidence: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  portionDescription: string;
  notes?: string;
};

export type LoggedMeal = MealAnalysis & {
  id: string;
  loggedAt: string; // ISO
};
