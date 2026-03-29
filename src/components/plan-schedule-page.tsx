"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScheduleOptionsPanel } from "@/components/schedule-options-panel";
import { PlanTimelineContent } from "@/components/plan-timeline-content";
import type { DegreePlan } from "@/types/plan";

const SAVED_PLAN_OVERRIDE_KEY = "coursehorse.savedPlanOverride";

async function fetchPlan(variant: "saved" | "experimental"): Promise<DegreePlan> {
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

async function fetchPlanForSubject(subject: string, maxCredits = 18): Promise<DegreePlan> {
  const res = await fetch(
    `/api/plan?variant=saved&subject=${encodeURIComponent(subject)}&completed=&maxCredits=${maxCredits}`,
  );
  if (!res.ok) throw new Error("Could not build academic plan");
  return res.json();
}

export function PlanSchedulePage() {
  const [savedOverride, setSavedOverride] = useState<DegreePlan | null>(null);
  const [draftPlan, setDraftPlan] = useState<DegreePlan | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_PLAN_OVERRIDE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DegreePlan;
      queueMicrotask(() => setSavedOverride(parsed));
    } catch { /* ignore */ }
  }, []);

  const savedQuery = useQuery({ queryKey: ["plan", "saved"], queryFn: () => fetchPlan("saved") });
  const activeData = draftPlan ?? savedOverride ?? savedQuery.data;
  const totalCredits = activeData?.semesters.reduce((s, sem) => s + sem.creditsTotal, 0) ?? 0;

  const buildWithHorsey = useCallback(async (major: string) => {
    const majorUpper = major.toUpperCase();
    try {
      localStorage.setItem("coursehorse.onboarding.v1", JSON.stringify({ major: majorUpper }));
      localStorage.setItem("coursehorse.schedulePrefs", JSON.stringify({ majors: majorUpper }));
    } catch { /* ignore */ }

    let builtPlan: DegreePlan | null = null;
    try {
      const res = await fetch("/api/horsey/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Build me a full schedule for ${majorUpper}` }],
          context: { view: "plan", major: majorUpper },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { planAction?: DegreePlan };
        if (data.planAction && data.planAction.semesters.length > 0) {
          builtPlan = data.planAction;
        }
      }
    } catch {
      // Fall through to deterministic API fallback below.
    }

    if (!builtPlan) {
      builtPlan = await fetchPlanForSubject(majorUpper);
    }

    setDraftPlan(builtPlan);
  }, []);

  const saveAcademicPlan = useCallback(() => {
    if (!draftPlan) return;
    localStorage.setItem(SAVED_PLAN_OVERRIDE_KEY, JSON.stringify(draftPlan));
    setSavedOverride(draftPlan);
    setDraftPlan(null);
    void savedQuery.refetch();
  }, [draftPlan, savedQuery]);

  const clearAcademicPlan = useCallback(() => {
    setDraftPlan(null);
    setSavedOverride(null);
    localStorage.removeItem(SAVED_PLAN_OVERRIDE_KEY);
    void savedQuery.refetch();
  }, [savedQuery]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <ScheduleOptionsPanel
        onBuildWithHorsey={buildWithHorsey}
        onSaveAcademicPlan={saveAcademicPlan}
        onClearAcademicPlan={clearAcademicPlan}
        canSave={Boolean(draftPlan)}
        hasAnyPlan={Boolean(draftPlan || savedOverride || savedQuery.data)}
        totalCredits={totalCredits}
      />
      <div className="min-w-0 flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Your academic plan</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-600">
            Review semester columns and jump to the graph for any course. Build with
            Horsey, save your current draft, or clear to start a new plan.
          </p>
        </div>
        <PlanTimelineContent
          variant="saved"
          savedOverride={draftPlan ?? savedOverride}
          query={savedQuery}
        />
      </div>
    </div>
  );
}
