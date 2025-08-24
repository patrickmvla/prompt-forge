import { create } from 'zustand'
import type { PromptBlueprint } from '@promptforge/shared'

interface BlueprintState {
  activeBlueprint: PromptBlueprint | null;
  setActiveBlueprint: (blueprint: PromptBlueprint | null) => void;
}

export const useBlueprintStore = create<BlueprintState>((set) => ({
  activeBlueprint: null,
  setActiveBlueprint: (blueprint) => set({ activeBlueprint: blueprint }),
}));
