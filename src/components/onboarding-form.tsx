"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { onboardingSchema, type OnboardingForm as OnboardingValues } from "@/types/student";

const STORAGE_KEY = "coursehorse.onboarding.v1";

export function OnboardingForm() {
  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      institution: "",
      major: "",
      completedCourseIds: [],
      constraints: { maxCreditsPerSemester: 18, workHoursPerWeek: 20 },
    },
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<OnboardingValues>;
      form.reset({ ...form.getValues(), ...parsed });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  function onSubmit(values: OnboardingValues) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    form.reset(values);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label className="text-sm font-medium text-stone-800" htmlFor="inst">
          Institution
        </label>
        <input
          id="inst"
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          {...form.register("institution")}
        />
        {form.formState.errors.institution ? (
          <p className="mt-1 text-xs text-red-600">
            {form.formState.errors.institution.message}
          </p>
        ) : null}
      </div>
      <div>
        <label className="text-sm font-medium text-stone-800" htmlFor="major">
          Major
        </label>
        <input
          id="major"
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          {...form.register("major")}
        />
        {form.formState.errors.major ? (
          <p className="mt-1 text-xs text-red-600">
            {form.formState.errors.major.message}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-stone-800" htmlFor="maxc">
            Max credits / term
          </label>
          <input
            id="maxc"
            type="number"
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            {...form.register("constraints.maxCreditsPerSemester", {
              valueAsNumber: true,
            })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-800" htmlFor="work">
            Work hours / week
          </label>
          <input
            id="work"
            type="number"
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            {...form.register("constraints.workHoursPerWeek", {
              valueAsNumber: true,
            })}
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-amber-950 hover:bg-amber-400"
      >
        Save draft
      </button>
      {form.formState.isSubmitSuccessful ? (
        <p className="text-center text-xs text-emerald-700">Saved locally.</p>
      ) : null}
    </form>
  );
}
