"use client";

import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui";
import { useUiStore } from "@/stores/ui-store";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-amber-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 4v16" />
      </svg>
    ),
    title: "Bulletin-Aligned Scheduling",
    desc: "Generate semester plans that follow prerequisite chains and align with major requirements.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-sky-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" />
        <path d="M8.5 7.5 10.5 16M15.5 7.5 13.5 16" />
      </svg>
    ),
    title: "Interactive Prerequisite Intelligence",
    desc: "Explore course dependencies visually, jump to blockers fast, and trace every path to graduation.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Course Q&A with Real Catalog Data",
    desc: "Ask Horsey about courses, sequencing, and planning tradeoffs using your catalog and degree context.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-violet-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h7" />
        <path d="M16 14l4 4-4 4" />
      </svg>
    ),
    title: "Internship Readiness Navigator",
    desc: "Connect target internships to the classes that strengthen your profile and close missing skill signals.",
  },
];

export default function AppHomePage() {
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-amber-50 via-white to-sky-50">
        <div className="relative px-5 py-7 md:px-8 md:py-8">
          <div className="pointer-events-none absolute -right-4 top-2 hidden md:block">
            <Image
              src="/horse-logo.png"
              alt="Horse mascot"
              width={220}
              height={220}
              priority
              className="h-40 w-40 rotate-[-8deg] rounded-2xl border border-amber-200/70 bg-white/70 object-contain p-2 shadow-lg"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Course Horse
            </p>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl lg:text-4xl">
              Your academic copilots for classes, prerequisites, and internships.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-700 sm:text-base">
              Course Horse is more than an academic plan builder. Plan your degree, inspect prerequisite
              chains, ask course questions backed by real catalog data, and identify which classes
              best support internship goals.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => setHorseyOpen(true)}
                className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-yellow-400 px-5 py-2.5 text-sm font-bold tracking-wide text-yellow-950 shadow-[0_0_0_2px_rgba(253,224,71,0.45),0_8px_20px_rgba(202,138,4,0.25)] transition hover:bg-yellow-300"
              >
                Ask Horsey AI - Your Academic Copilot
              </button>
              <Link
                href="/app/plan"
                className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-400"
              >
                Open your plan
              </Link>
              <Link
                href="/app/graph"
                className="inline-flex items-center justify-center rounded-[var(--radius-button)] border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
              >
                View prerequisite graph
              </Link>
              <Link
                href="/app/internships"
                className="inline-flex items-center justify-center rounded-[var(--radius-button)] border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
              >
                Explore internships
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
            Everything in one planning workspace
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {features.map((f) => (
            <Card
              key={f.title}
              className="h-full space-y-2.5 border-stone-200 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {f.icon}
              <h3 className="text-sm font-semibold text-stone-900">{f.title}</h3>
              <p className="text-xs leading-relaxed text-stone-600">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200 pt-6 text-center">
        <p className="text-[11px] text-stone-400">
          Course Horse · Degree planning, prerequisite analytics, and internship readiness in one workspace
        </p>
      </footer>
    </div>
  );
}
