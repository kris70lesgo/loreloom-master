"use client";

import { create } from "zustand";

export type AspectRatio = "16:9" | "1:1" | "9:16";

export interface WorkspaceStoreState {
  /* ── UI state ── */
  selectedChapterId: string | null;
  newChapterPrompt: string;
  isMinting: string | null;
  inputFocused: boolean;

  /* ── Style-lock & image generation controls ── */
  styleLock: boolean;
  aspectRatio: AspectRatio;

  /* ── Generation state ── */
  generating: boolean;

  /* ── Canvas fullscreen ── */
  canvasFullscreen: boolean;

  /* ── Prompt box expand ── */
  promptExpanded: boolean;

  /* ── Chapter card drag order (stored separately from canonical list) ── */
  chapterOrder: string[];

  /* ── Migrated local state from page.tsx ── */
  lastImageSeed: string | null;
  activeDragId: string | null;
  isClient: boolean;

  /* ── Narrative auto-inject ── */
  narrativeContext: string;

  /* ── Actions ── */
  setSelectedChapterId: (id: string | null) => void;
  setNewChapterPrompt: (prompt: string) => void;
  setIsMinting: (id: string | null) => void;
  setInputFocused: (focused: boolean) => void;
  setStyleLock: (locked: boolean) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setGenerating: (gen: boolean) => void;
  setCanvasFullscreen: (fs: boolean) => void;
  setPromptExpanded: (expanded: boolean) => void;
  setChapterOrder: (order: string[]) => void;
  reorderChapters: (activeId: string, overId: string) => void;

  /* ── New actions for migrated state ── */
  setLastImageSeed: (seed: string | null) => void;
  setActiveDragId: (id: string | null) => void;
  setIsClient: (v: boolean) => void;
  setNarrativeContext: (text: string) => void;

  /* ── Persistence ── */
  persistToSession: () => void;
  restoreFromSession: () => void;
  persistGenerationParams: (prompt: string, styleLock: boolean, aspectRatio: AspectRatio) => void;
  resetWorkspace: () => void;
}

const STORAGE_KEY = "loreloom_workspace_state";

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => ({
  /* ── defaults ── */
  selectedChapterId: null,
  newChapterPrompt: "",
  isMinting: null,
  inputFocused: false,
  generating: false,
  styleLock: false,
  aspectRatio: "16:9",
  canvasFullscreen: false,
  promptExpanded: false,
  chapterOrder: [],

  /* ── migrated local state defaults ── */
  lastImageSeed: null,
  activeDragId: null,
  isClient: false,
  narrativeContext: "",

  /* ── actions ── */
  setSelectedChapterId: (id) => set({ selectedChapterId: id }),
  setNewChapterPrompt: (prompt) => set({ newChapterPrompt: prompt }),
  setIsMinting: (id) => set({ isMinting: id }),
  setInputFocused: (focused) => set({ inputFocused: focused }),
  setStyleLock: (locked) => set({ styleLock: locked }),
  setGenerating: (gen) => set({ generating: gen }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setCanvasFullscreen: (fs) => set({ canvasFullscreen: fs }),
  setPromptExpanded: (expanded) => set({ promptExpanded: expanded }),
  setChapterOrder: (order) => set({ chapterOrder: order }),
  setLastImageSeed: (seed) => set({ lastImageSeed: seed }),
  setActiveDragId: (id) => set({ activeDragId: id }),
  setIsClient: (v) => set({ isClient: v }),
  setNarrativeContext: (text) => set({ narrativeContext: text }),

  reorderChapters: (activeId, overId) => {
    const { chapterOrder } = get();
    const oldIdx = chapterOrder.indexOf(activeId);
    const newIdx = chapterOrder.indexOf(overId);
    if (oldIdx === -1 || newIdx === -1) return;
    const updated = [...chapterOrder];
    updated.splice(oldIdx, 1);
    updated.splice(newIdx, 0, activeId);
    set({ chapterOrder: updated });
  },

  /* ── persistence ── */
  persistToSession: () => {
    try {
      const { selectedChapterId, styleLock, aspectRatio, canvasFullscreen, chapterOrder, newChapterPrompt } = get();
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ selectedChapterId, styleLock, aspectRatio, canvasFullscreen, chapterOrder, newChapterPrompt })
      );
    } catch {
      /* sessionStorage may be unavailable */
    }
  },

  restoreFromSession: () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({
        selectedChapterId: parsed.selectedChapterId ?? null,
        styleLock: parsed.styleLock ?? false,
        aspectRatio: parsed.aspectRatio ?? "16:9",
        canvasFullscreen: parsed.canvasFullscreen ?? false,
        chapterOrder: parsed.chapterOrder ?? [],
      });
    } catch {
      /* ignore */
    }
  },

  persistGenerationParams: (prompt: string, lock: boolean, ratio: AspectRatio) => {
    try {
      sessionStorage.setItem(
        `${STORAGE_KEY}_gen`,
        JSON.stringify({ prompt, styleLock: lock, aspectRatio: ratio, timestamp: Date.now() })
      );
    } catch {
      /* ignore */
    }
  },

  resetWorkspace: () => {
    set({
      selectedChapterId: null,
      newChapterPrompt: "",
      isMinting: null,
      inputFocused: false,
  styleLock: true,
      aspectRatio: "16:9",
      canvasFullscreen: false,
      promptExpanded: false,
      chapterOrder: [],
      lastImageSeed: null,
      activeDragId: null,
      narrativeContext: "",
    });
  },
}));
