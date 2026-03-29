import { create } from "zustand";
import type { CourseGraphPayload } from "@/types/graph";
import type { DegreePlan } from "@/types/plan";

type HorseyContext = {
  view: "home" | "plan" | "graph" | "settings";
  selectedCourse?: { id: string; code: string };
};

type UiState = {
  horseyOpen: boolean;
  setHorseyOpen: (open: boolean) => void;
  horseyContext: HorseyContext;
  setHorseyContext: (ctx: Partial<HorseyContext>) => void;
  graphPayload: CourseGraphPayload | null;
  setGraphPayload: (payload: CourseGraphPayload) => void;
  clearGraphPayload: () => void;
  planPayload: DegreePlan | null;
  setPlanPayload: (payload: DegreePlan) => void;
  clearPlanPayload: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  horseyOpen: false,
  setHorseyOpen: (open) => set({ horseyOpen: open }),
  horseyContext: { view: "home" },
  setHorseyContext: (ctx) =>
    set((s) => ({ horseyContext: { ...s.horseyContext, ...ctx } })),
  graphPayload: null,
  setGraphPayload: (payload) => set({ graphPayload: payload }),
  clearGraphPayload: () => set({ graphPayload: null }),
  planPayload: null,
  setPlanPayload: (payload) => set({ planPayload: payload }),
  clearPlanPayload: () => set({ planPayload: null }),
}));
