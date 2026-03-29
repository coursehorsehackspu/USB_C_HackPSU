import { z } from "zod";

export const courseStatusSchema = z.enum(["completed", "available", "locked"]);
export type CourseStatus = z.infer<typeof courseStatusSchema>;

export const constraintsSchema = z.object({
  maxCreditsPerSemester: z.number().min(6).max(24),
  workHoursPerWeek: z.number().min(0).max(60),
});

export type StudentConstraints = z.infer<typeof constraintsSchema>;

export const onboardingSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  major: z.string().min(1, "Major is required"),
  completedCourseIds: z.array(z.string()),
  constraints: constraintsSchema,
});

export type OnboardingForm = z.infer<typeof onboardingSchema>;
