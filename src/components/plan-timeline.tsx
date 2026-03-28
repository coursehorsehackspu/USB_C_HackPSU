"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { DegreePlan } from "@/types/plan";

async function fetchPlan(): Promise<DegreePlan> {
  const res = await fetch("/api/plan");
  if (!res.ok) throw new Error("Could not load plan");
  return res.json();
}

export function PlanTimeline() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["plan"],
    queryFn: fetchPlan,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl bg-stone-100"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-800">
        <p className="font-medium">Something went wrong loading your plan.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 rounded-lg bg-white px-3 py-1.5 text-red-800 ring-1 ring-red-200 hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {data.semesters.map((sem) => (
        <section
          key={sem.id}
          className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 border-b border-stone-100 pb-2">
            <h2 className="text-sm font-semibold text-stone-900">{sem.label}</h2>
            <p className="text-xs text-stone-500">
              {sem.creditsTotal} credits
              {sem.warnings.length > 0 ? " · needs attention" : ""}
            </p>
          </div>
          {sem.warnings.length > 0 ? (
            <ul className="mb-3 space-y-1 text-xs text-amber-900">
              {sem.warnings.map((w) => (
                <li key={w.code} className="rounded-lg bg-amber-50 px-2 py-1.5">
                  {w.message}
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="flex flex-1 flex-col gap-2">
            {sem.courses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/graph?focus=${encodeURIComponent(c.id)}`}
                  className="block rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2 transition hover:border-amber-200 hover:bg-amber-50/50"
                >
                  <div className="text-sm font-medium text-stone-900">{c.code}</div>
                  <div className="text-xs text-stone-600 line-clamp-2">{c.title}</div>
                  <div className="mt-1 text-[11px] text-stone-400">{c.credits} cr</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
