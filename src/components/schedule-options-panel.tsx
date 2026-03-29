"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { DegreeProgress } from "@/components/degree-progress";

const PREFS_KEY = "coursehorse.schedulePrefs";

type Prefs = {
  majors: string;
};

const defaultPrefs: Prefs = { majors: "" };

type Props = {
  onBuildWithHorsey: (major: string) => Promise<void>;
  onSaveAcademicPlan: () => void;
  onClearAcademicPlan: () => void;
  canSave: boolean;
  hasAnyPlan: boolean;
  totalCredits: number;
};

export function ScheduleOptionsPanel({
  onBuildWithHorsey,
  onSaveAcademicPlan,
  onClearAcademicPlan,
  canSave,
  hasAnyPlan,
  totalCredits,
}: Props) {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Prefs>;
      const next = { ...defaultPrefs, ...parsed };
      queueMicrotask(() => setPrefs(next));
    } catch { /* ignore */ }
  }, []);

  function persist(next: Prefs) {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  }

  async function handleBuild() {
    const major = prefs.majors.trim();
    if (!major) {
      setError("Enter your major first (e.g. Computer Science).");
      return;
    }
    setError(null);
    setIsBuilding(true);
    try {
      await onBuildWithHorsey(major);
    } catch {
      setError("Could not build academic plan right now. Try again.");
    } finally {
      setIsBuilding(false);
    }
  }

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80">
      <div className="space-y-4">
        <Card className="flex items-center justify-center p-5">
          <DegreeProgress completed={totalCredits} required={120} size="sm" />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-stone-900">Build with Horsey</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Enter your major and let Horsey generate your academic plan.
          </p>
          <div className="mt-4 space-y-3">
            <Input
              id="majors"
              label="Major"
              value={prefs.majors}
              onChange={(e) => persist({ ...prefs, majors: e.target.value })}
              placeholder="e.g. Computer Science (CMPSC)"
            />
          </div>

          <div className="mt-5 border-t border-stone-100 pt-4">
            <Button
              className="w-full bg-yellow-400 text-yellow-950 shadow-[0_0_0_2px_rgba(253,224,71,0.45),0_8px_20px_rgba(202,138,4,0.25)] hover:bg-yellow-300"
              onClick={handleBuild}
              disabled={isBuilding}
            >
              {isBuilding ? "Building academic plan..." : "Ask Horsey to Build Academic Plan"}
            </Button>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              Horsey uses your major and catalog context to generate the plan.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={onSaveAcademicPlan} disabled={!canSave}>
                Save plan
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearAcademicPlan} disabled={!hasAnyPlan}>
                Clear plan
              </Button>
            </div>
          </div>

          {error ? <p className="mt-3 text-center text-xs text-red-700">{error}</p> : null}
        </Card>
      </div>
    </aside>
  );
}
