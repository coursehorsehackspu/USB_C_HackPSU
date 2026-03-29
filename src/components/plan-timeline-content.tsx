"use client";

import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DegreePlan } from "@/types/plan";
import type { ScheduleVariant } from "@/types/schedule";
import { Card, Badge, Button } from "@/components/ui";

type Props = {
  variant: ScheduleVariant;
  savedOverride: DegreePlan | null;
  query: UseQueryResult<DegreePlan, Error>;
};

export function PlanTimelineContent({ variant, savedOverride, query }: Props) {
  const { data: apiData, isLoading, isError, refetch } = query;
  const data = variant === "saved" && savedOverride ? savedOverride : apiData;

  if (isLoading && !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-[var(--radius-card)] bg-stone-100" aria-hidden />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card variant="warning" className="space-y-3">
        <p className="text-sm font-medium text-red-800">Something went wrong loading your plan.</p>
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const totalCredits = data.semesters.reduce((s, sem) => s + sem.creditsTotal, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span>{data.semesters.length} semesters</span>
        <span className="h-1 w-1 rounded-full bg-stone-300" />
        <span>{totalCredits} total credits</span>
        {variant === "experimental" ? <Badge variant="available">Experimental</Badge> : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {data.semesters.map((sem, idx) => (
          <section
            key={sem.id}
            className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-[var(--radius-card)] border border-stone-200 bg-white shadow-sm"
          >
            <div className="border-b border-stone-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">{sem.label}</h2>
                <span className="text-[11px] text-stone-400">Sem {idx + 1}</span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500">{sem.creditsTotal} credits</p>
            </div>

            {sem.warnings.length > 0 ? (
              <div className="border-b border-amber-100 bg-amber-50/60 px-4 py-2.5">
                {sem.warnings.map((w) => (
                  <div key={w.code} className="flex items-start gap-2 text-xs text-amber-900">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <ul className="flex flex-1 flex-col gap-2 p-3">
              {sem.courses.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/graph?focus=${encodeURIComponent(c.id)}`}
                    className="flex items-start gap-2 rounded-[var(--radius-button)] border border-stone-100 bg-stone-50/60 px-3 py-2 transition hover:border-amber-200 hover:bg-amber-50/40"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-stone-900">{c.code}</div>
                      <div className="truncate text-xs text-stone-600">{c.title}</div>
                    </div>
                    <span className="shrink-0 text-[11px] text-stone-400">{c.credits} cr</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
