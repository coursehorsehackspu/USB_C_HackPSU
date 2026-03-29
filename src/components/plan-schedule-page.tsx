// src/components/plan-schedule-page.tsx
// Updated to support schedule generation from Horsey
"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScheduleOptionsPanel } from "@/components/schedule-options-panel";
import { PlanTimelineContent } from "@/components/plan-timeline-content";
import type { DegreePlan } from "@/types/plan";
import type { ScheduleVariant } from "@/types/schedule";

const SAVED_PLAN_OVERRIDE_KEY = "coursehorse.savedPlanOverride";
const HORSEY_SCHEDULE_KEY = "coursehorse.horseySchedule";

async function fetchPlan(variant: ScheduleVariant): Promise<DegreePlan> {
  const stored = localStorage.getItem("coursehorse.onboarding.v1");
  const onboarding = stored
    ? (JSON.parse(stored) as { major?: string; completedCourseIds?: string[]; constraints?: { maxCreditsPerSemester?: number } })
    : {};

  const subject = onboarding.major?.toUpperCase() || "CMPSC";
  const completed = (onboarding.completedCourseIds || []).join(",");
  const maxCredits = onboarding.constraints?.maxCreditsPerSemester ?? 18;

  const res = await fetch(
    `/api/plan?variant=${variant}&subject=${subject}&completed=${completed}&maxCredits=${maxCredits}`
  );
  if (!res.ok) throw new Error("Could not load plan");
  return res.json();
}

export function PlanSchedulePage() {
  const queryClient = useQueryClient();
  const [scheduleVariant, setScheduleVariant] = useState<ScheduleVariant>("saved");
  const [savedOverride, setSavedOverride] = useState<DegreePlan | null>(null);

  // Load saved override from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_PLAN_OVERRIDE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DegreePlan;
        queueMicrotask(() => setSavedOverride(parsed));
      }
    } catch { /* ignore */ }
  }, []);

  // Listen for Horsey-generated schedules
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === HORSEY_SCHEDULE_KEY && e.newValue) {
        try {
          const plan = JSON.parse(e.newValue) as DegreePlan;
          setSavedOverride(plan);
          localStorage.setItem(SAVED_PLAN_OVERRIDE_KEY, e.newValue);
          setScheduleVariant("saved");
          void queryClient.invalidateQueries({ queryKey: ["plan"] });
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);

    // Also check on mount in case Horsey already generated one
    const horseyPlan = localStorage.getItem(HORSEY_SCHEDULE_KEY);
    if (horseyPlan) {
      try {
        const plan = JSON.parse(horseyPlan) as DegreePlan;
        setSavedOverride(plan);
        localStorage.removeItem(HORSEY_SCHEDULE_KEY);
      } catch { /* ignore */ }
    }

    return () => window.removeEventListener("storage", handler);
  }, [queryClient]);

  const savedQuery = useQuery({ queryKey: ["plan", "saved"], queryFn: () => fetchPlan("saved") });
  const experimentalQuery = useQuery({ queryKey: ["plan", "experimental"], queryFn: () => fetchPlan("experimental") });

  const saveExperimentalAsSaved = useCallback(() => {
    const experimental = queryClient.getQueryData<DegreePlan>(["plan", "experimental"]);
    if (!experimental) return;
    try {
      localStorage.setItem(SAVED_PLAN_OVERRIDE_KEY, JSON.stringify(experimental));
      setSavedOverride(experimental);
      void queryClient.invalidateQueries({ queryKey: ["plan", "saved"] });
      setScheduleVariant("saved");
    } catch { /* ignore */ }
  }, [queryClient]);

  const clearSavedOverride = useCallback(() => {
    localStorage.removeItem(SAVED_PLAN_OVERRIDE_KEY);
    setSavedOverride(null);
    void queryClient.invalidateQueries({ queryKey: ["plan", "saved"] });
  }, [queryClient]);

  const regenerateExperimental = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["plan", "experimental"] });
  }, [queryClient]);

  const activeQuery = scheduleVariant === "saved" ? savedQuery : experimentalQuery;
  const activeData = scheduleVariant === "saved" && savedOverride ? savedOverride : activeQuery.data;
  const totalCredits = activeData?.semesters.reduce((s, sem) => s + sem.creditsTotal, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <ScheduleOptionsPanel
        scheduleVariant={scheduleVariant}
        onScheduleVariantChange={setScheduleVariant}
        onSaveExperimentalAsSaved={saveExperimentalAsSaved}
        onClearSavedOverride={clearSavedOverride}
        onRegenerateExperimental={regenerateExperimental}
        hasSavedOverride={Boolean(savedOverride)}
        totalCredits={totalCredits}
      />
      <div className="min-w-0 flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Your schedule</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-600">
            Review semester columns and jump to the graph for any course. Ask Horsey to generate a schedule for any major!
          </p>
        </div>
        <PlanTimelineContent
          variant={scheduleVariant}
          savedOverride={savedOverride}
          query={activeQuery}
        />
      </div>
    </div>
  );
}