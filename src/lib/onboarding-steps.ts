export const ONBOARDING_STEP_KEYS = [
  "nursingHours",
  "shiftTypes",
  "holidaySettings",
  "staff",
  "classes",
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];
