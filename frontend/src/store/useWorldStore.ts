"use client";

import { create } from "zustand";

interface WorldStoreState {
  /** The hero / protagonist name that must stay in sync everywhere. */
  heroName: string;
  /** Update the hero name globally — triggers universal re-render. */
  setHeroName: (name: string) => void;
}

export const useWorldStore = create<WorldStoreState>((set) => ({
  heroName: "",
  setHeroName: (name: string) => set({ heroName: name }),
}));
