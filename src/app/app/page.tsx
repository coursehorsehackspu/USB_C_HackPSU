import Link from "next/link";
import { DegreeProgress } from "@/components/degree-progress";
import { Card } from "@/components/ui";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-amber-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 4v16" />
      </svg>
    ),
    title: "Optimized Schedules",
    desc: "Multi-semester plans that respect your credit cap, work hours, and prereq chains.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-sky-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" />
        <path d="M8.5 7.5 10.5 16M15.5 7.5 13.5 16" />
      </svg>
    ),
    title: "Interactive Prereq Map",
    desc: "Pan, zoom, search, and trace dependency paths through your entire catalog.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "AI Counselor",
    desc: "Horsey answers questions about your plan, flags risks, and explains optimizer decisions.",
  },
];

export default function AppHomePage() {
  return (
    <div className="space-y-8">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Course Horse
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Graduate on time — without guessing your next semester.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600">
            See your optimized schedule, explore prereqs on an interactive map,
            and ask Horsey when something doesn't make sense. Built for students
            who want a plan, not a PDF buried on a registrar site.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app/plan"
              className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-amber-500 px-5 py-2.5 text-sm font-medium text-amber-950 shadow-sm hover:bg-amber-400"
            >
              Open your plan
            </Link>
            <Link
              href="/app/graph"
              className="inline-flex items-center justify-center rounded-[var(--radius-button)] border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              View prerequisite graph
            </Link>
          </div>
        </div>
        <Card className="flex items-center justify-center p-8">
          <DegreeProgress completed={46} required={120} size="lg" />
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="space-y-2 p-5">
            {f.icon}
            <h3 className="text-sm font-semibold text-stone-900">{f.title}</h3>
            <p className="text-xs leading-relaxed text-stone-600">{f.desc}</p>
          </Card>
        ))}
      </section>

      <footer className="border-t border-stone-200 pt-6 text-center">
        <p className="text-[11px] text-stone-400">
          Course Horse · Academic planning demo · Credits and courses shown are mock data
        </p>
      </footer>
    </div>
  );
}
