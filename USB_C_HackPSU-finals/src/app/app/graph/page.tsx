import { Suspense } from "react";
import { CourseGraphView } from "@/components/course-graph";

export default function GraphPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        Prerequisite map
      </h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">
        Green = completed, blue = available, gray = locked. Pan and zoom the canvas,
        hover edges to highlight dependencies, search to jump to a course. Press{" "}
        <kbd className="rounded bg-stone-200 px-1 text-xs">Esc</kbd> to clear
        selection.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <div
              className="h-[min(70vh,640px)] animate-pulse rounded-xl bg-stone-100"
              aria-hidden
            />
          }
        >
          <CourseGraphView />
        </Suspense>
      </div>
    </div>
  );
}
