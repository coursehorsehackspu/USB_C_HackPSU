import { PlanTimeline } from "@/components/plan-timeline";

export default function AppHomePage() {
  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Your plan
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-600">
            Multi-semester schedule from the optimizer (mock data for now). Open{" "}
            <span className="font-medium text-stone-800">Graph</span> to explore
            prereqs.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <PlanTimeline />
      </div>
    </div>
  );
}
