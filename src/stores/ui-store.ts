import { create } from "zustand";

type HorseyContext = {
  view: "home" | "plan" | "graph" | "settings";
  selectedCourse?: { id: string; code: string };
};

type UiState = {
  horseyOpen: boolean;
  setHorseyOpen: (open: boolean) => void;
  horseyContext: HorseyContext;
  setHorseyContext: (ctx: Partial<HorseyContext>) => void;
};

export const useUiStore = create<UiState>((set) => ({
  horseyOpen: false,
  setHorseyOpen: (open) => set({ horseyOpen: open }),
  horseyContext: { view: "home" },
  setHorseyContext: (ctx) =>
    set((s) => ({ horseyContext: { ...s.horseyContext, ...ctx } })),
}));
