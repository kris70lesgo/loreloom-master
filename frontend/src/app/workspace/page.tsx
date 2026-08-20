"use client";

import React, { useEffect, useCallback, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStory } from "../../context/StoryContext";
import { useWorldStore } from "../../store/useWorldStore";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import type { AspectRatio } from "../../store/useWorkspaceStore";
import { loreloomApiPath, loreloomFetch } from "@/lib/api/loreloomFetch";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { SimpleMarkdown } from "../../components/SimpleMarkdown";
import { VisualCanonGraphic } from "../../components/VisualCanonGraphic";
import { EntityDock } from "../../components/EntityDock";
import { ComplexityDot } from "../../components/ComplexityDot";
import {
  Stars01 as Sparkles,
  CpuChip01 as Cpu,
  Database01 as Database,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Lock01 as Lock,
  LockUnlocked01 as Unlock,
  Maximize01 as Maximize2,
  Minimize01 as Minimize2,
  DotsGrid as GripVertical,
  Loading01 as Loader2,
  MagicWand01 as Wand2,
  BookOpen01 as BookOpen,
  Trash01 as Trash2,
  Film01 as Film,
  Image01 as ImageIcon,
  Square,
  Plus,
  ChevronDown,
} from "@untitledui/icons";
import {
  GripVertical as LucideGripVertical,
  Layers as LucideLayers,
  Film as LucideFilm,
  Database as LucideDatabase,
  Link2 as LucideLink2,
  Play as LucidePlay,
  Eye as LucideEye,
  Plus as LucidePlus,
  Trash2 as LucideTrash2,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  ChevronDown as LucideChevronDown,
  Lock as LucideLock,
  Square as LucideSquare,
  Smartphone as LucideSmartphone,
  Sparkles as LucideSparkles,
  Loader2 as LucideLoader2,
} from "lucide-react";
import { HiSparkles } from "react-icons/hi2";


/* ─── Shared entrance animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: "spring" as const, damping: 22, stiffness: 60, delay: i * 0.08 },
  }),
};

/* ─── Glass panel base ─── */
const glass: React.CSSProperties = {
  background: "var(--card-bg)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid hsl(var(--border))",
  borderRadius: "16px",
};

/* ═══════════════════════════════════════════════
   DRAGGABLE CHAPTER CARD
   ═══════════════════════════════════════════════ */
function SortableChapterCard({
  chapter,
  isActive,
  chapterIndex,
  totalChapters,
  onClick,
  onDelete,
}: {
  chapter: { id: string; number: number; isMinted: boolean };
  isActive: boolean;
  chapterIndex: number;
  totalChapters: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });

  const dndTransition = transition || "";
  const style: React.CSSProperties = {
    transform: transform 
      ? `${CSS.Transform.toString(transform)} scale(${isDragging ? 0.98 : 1})` 
      : `scale(${isDragging ? 0.98 : 1})`,
    transition: [`border-color 0.2s`, `box-shadow 0.2s`, `background 0.2s`, `transform 0.15s`]
      .concat(dndTransition ? [dndTransition] : []).join(", "),
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex items-center justify-center px-4 py-2 h-11 gap-3 min-w-[110px] rounded-lg shrink-0 select-none backdrop-blur-md transition-all duration-200 
        ${isDragging 
          ? "bg-gray-100 border border-cyan-400 opacity-70 scale-[0.98] shadow-sm dark:bg-cyan-950/50 dark:border-cyan-400/60" 
          : isActive 
            ? "bg-gray-100 border-2 border-cyan-500 shadow-md dark:bg-cyan-950/60 dark:border-cyan-400" 
            : "bg-gray-100 border border-gray-200 hover:border-cyan-400 hover:bg-gray-200/80 shadow-sm dark:bg-[#11141b]/90 dark:border-white/15 dark:hover:border-cyan-400/50 dark:hover:bg-[#181d28]"
        }`}
    >
      {/* Full-card Drag Listener Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-0 rounded-lg"
      />

      {/* LEFT: Chapter Number */}
      <span 
        className={`text-xs font-mono font-bold tracking-wider shrink-0 z-10 pointer-events-none transition-colors
          ${isActive ? "text-cyan-600 dark:text-cyan-300" : "text-gray-700 group-hover:text-gray-900 dark:text-white/90 dark:group-hover:text-white"}`}
      >
        {String(chapter.number).padStart(2, "0")}
      </span>

      {/* MIDDLE: State / Play Indicator */}
      <div className="flex items-center justify-center shrink-0 w-4 h-4 z-10 pointer-events-none">
        {isActive ? (
          <LucidePlay size={14} className="text-cyan-600 fill-cyan-600/30 drop-shadow-sm dark:text-cyan-400 dark:fill-cyan-400/30" strokeWidth={1.5} />
        ) : isHovered ? (
          <LucideEye size={14} className="text-cyan-600 dark:text-cyan-300" strokeWidth={1.5} />
        ) : (
          <LucidePlay size={14} className="text-gray-500 group-hover:text-gray-700 dark:text-white/40 dark:group-hover:text-white/70" strokeWidth={1.5} />
        )}
      </div>

      {/* RIGHT: Delete Button or On-Chain Database Badge */}
      <div className="flex items-center justify-end shrink-0 z-10">
        {!chapter.isMinted ? (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete chapter"
            className="flex items-center justify-center p-1 rounded text-black hover:text-red-600 hover:bg-red-100 transition-all cursor-pointer dark:text-white/60 dark:hover:text-red-400 dark:hover:bg-red-500/20"
          >
            <LucideTrash2 size={14} strokeWidth={1.8} className="text-black dark:text-white/80" />
          </button>
        ) : (
          <span title="On-Chain">
            <LucideDatabase size={14} className="text-emerald-500 shrink-0" strokeWidth={1.5} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   WORKSPACE CONTENT
   ═══════════════════════════════════════════════ */
function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worldIdParam = searchParams.get("worldId");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const { activeWorld, switchWorld, draftNewChapter, regenerateChapterImage, commitChapterToCanon, deleteChapter, fetchWorld, reorderChapters } = useStory();
  const heroName = useWorldStore((s) => s.heroName);

  const ws = useWorkspaceStore();
  const selectedChapterId = ws.selectedChapterId;
  const newChapterPrompt = ws.newChapterPrompt;
  const isMinting = ws.isMinting;
  const inputFocused = ws.inputFocused;
  const styleLock = ws.styleLock;
  const aspectRatio = ws.aspectRatio;
  const canvasFullscreen = ws.canvasFullscreen;
  const promptExpanded = ws.promptExpanded;
  const chapterOrder = ws.chapterOrder;
  const generating = ws.generating;
  const isClient = ws.isClient;
  const activeDragId = ws.activeDragId;
  const lastImageSeed = ws.lastImageSeed;
  const narrativeContext = ws.narrativeContext;
  const [genProgress, setGenProgress] = useState(0);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [isRefiningNarrative, setIsRefiningNarrative] = useState(false);
  const [narrativeText, setNarrativeText] = useState<string | null>(null); // local override for AI-edited text
  const [showGenConfirm, setShowGenConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const prevChaptersRef = useRef<any[]>([]);
  const activeWorldRef = useRef(activeWorld);
  const selectedChapterIdRef = useRef(selectedChapterId);
  const generatingRef = useRef(generating);

  useEffect(() => {
    activeWorldRef.current = activeWorld;
    selectedChapterIdRef.current = selectedChapterId;
    generatingRef.current = generating;
  }, [activeWorld, selectedChapterId, generating]);

  // Dismiss toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Track chapter status transitions to display Toast alerts
  useEffect(() => {
    if (!activeWorld) return;
    const prevChapters = prevChaptersRef.current;
    
    activeWorld.chapters.forEach((ch, idx) => {
      const prevCh = prevChapters.find((p) => p.id === ch.id);
      if (prevCh) {
        const displayNum = idx + 1;
        if (prevCh.status === "text_ready" && ch.status === "image_ready") {
          setToast({ message: `Chapter ${displayNum} image generated successfully!`, type: "success" });
        }
        if (prevCh.status === "text_ready" && ch.status === "failed") {
          setToast({ message: `Chapter ${displayNum} image generation failed.`, type: "error" });
        }
      }
    });

    prevChaptersRef.current = activeWorld.chapters;
  }, [activeWorld]);

  // Detect quota exceeded errors from failed API calls
  useEffect(() => {
    if (!activeWorld || activeWorld.id.startsWith("world-neo-") || activeWorld.id.startsWith("world-aetheria")) return;
    if (!generating) return;
    const check = async () => {
      try {
        const res = await loreloomFetch(loreloomApiPath(`/api/worlds/${activeWorld.id}`));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.code === "QUOTA_EXCEEDED") setQuotaError(data.error || "AI provider quota exceeded");
        }
      } catch {}
    };
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [activeWorld, generating]);

  // Simulate progress during generation
  useEffect(() => {
    if (!generating) { setGenProgress(0); return; }
    setGenProgress(5);
    const interval = setInterval(() => {
      setGenProgress((prev) => {
        if (prev < 50) return prev + Math.floor(Math.random() * 6) + 2;
        if (prev < 85) return prev + Math.floor(Math.random() * 3) + 1;
        return prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [generating]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Hydration + session restore
  useEffect(() => {
    ws.setIsClient(true);
    ws.restoreFromSession();
  }, []);

  // Persist to session on change
  useEffect(() => {
    ws.persistToSession();
  }, [selectedChapterId, newChapterPrompt, styleLock, aspectRatio, canvasFullscreen, chapterOrder, generating]);

  // Sync worldId from URL & ensure backend details are loaded
  useEffect(() => {
    if (worldIdParam) {
      if (!activeWorld || worldIdParam !== activeWorld.id) {
        ws.resetWorkspace();
        switchWorld(worldIdParam);
        fetchWorld(worldIdParam);
      }
    }
  }, [worldIdParam, fetchWorld]);

  const autoGenRef = useRef(false);

  // Auto-select latest chapter
  useEffect(() => {
    if (activeWorld && activeWorld.chapters.length > 0 && !selectedChapterId) {
      ws.setSelectedChapterId(activeWorld.chapters[activeWorld.chapters.length - 1].id);
    }
  }, [activeWorld, selectedChapterId]);

  // Auto-generate first chapter for Genesis worlds
  useEffect(() => {
    if (activeWorld && activeWorld.chapters.length === 0 && !activeWorld.id.startsWith("world-neo-") && !activeWorld.id.startsWith("world-aetheria") && activeWorld.premise && !autoGenRef.current) {
      autoGenRef.current = true;
      ws.setGenerating(true);
      draftNewChapter(activeWorld.premise, styleLock, aspectRatio);
    }
  }, [activeWorld, styleLock, aspectRatio, draftNewChapter]);

  // Build chapterOrder
  useEffect(() => {
    if (activeWorld && activeWorld.chapters.length > 0 && chapterOrder.length === 0) {
      ws.setChapterOrder(activeWorld.chapters.map((ch) => ch.id));
    }
  }, [activeWorld, chapterOrder.length]);

  // Polling
  const activeWorldIdStr = activeWorld?.id;
  useEffect(() => {
    if (!activeWorldIdStr || activeWorldIdStr.startsWith("world-neo-") || activeWorldIdStr.startsWith("world-aetheria")) return;
    let isMounted = true;

    const checkNeedsPoll = () => {
      const currentWorld = activeWorldRef.current;
      if (!currentWorld) return false;
      return currentWorld.chapters.some((ch) => {
        // If chapter is in draft, we always poll for the text
        if (ch.status === "draft" || !ch.storyText) return true;
        // If chapter is text_ready, we only poll if generating is true (actively generating image)
        if (ch.status === "text_ready" && ch.id === selectedChapterId) {
          return generating;
        }
        return false;
      });
    };

    const pollOnce = async () => {
      if (!isMounted) return;
      const needsPoll = checkNeedsPoll();
      console.log(`[workspace-poll] Tick - needsPoll: ${needsPoll}, generating: ${generating}`);

      if (needsPoll) {
        try {
          console.log("[workspace-poll] Fetching updated world state from server...");
          await fetchWorld(activeWorldIdStr);
        } catch (err) {
          console.warn("[workspace-poll] Poll error:", err);
        }
      } else if (generating) {
        console.log("[workspace-poll] Generation completed. Setting generating=false.");
        ws.setGenerating(false);
      }
    };

    // Trigger immediate poll so UI reacts instantly without waiting 3 seconds
    pollOnce();

    const interval = setInterval(pollOnce, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      console.log("[workspace-poll] Cleaning up stable poll interval.");
    };
  }, [activeWorldIdStr, fetchWorld, generating, selectedChapterId]);

  // ── Derived data ──
  const orderedChapters = activeWorld
    ? chapterOrder.length > 0
      ? chapterOrder.map((id) => activeWorld.chapters.find((ch) => ch.id === id)).filter((ch): ch is NonNullable<typeof ch> => ch !== undefined)
      : activeWorld.chapters
    : [];
  const selectedChapter = orderedChapters.find((c) => c.id === selectedChapterId) || orderedChapters[orderedChapters.length - 1] || null;
  const chapterIndex = orderedChapters.findIndex((c) => c.id === selectedChapter?.id);
  const isWeavingText = generating && selectedChapter?.status === "draft";

  // Reset local narrative text when chapter changes
  useEffect(() => {
    setNarrativeText(null);
    if (selectedChapter?.storyText) {
      ws.setNarrativeContext(selectedChapter.storyText);
    }
  }, [selectedChapter?.id]);

  // Track last image seed for ghost loading
  useEffect(() => {
    if (selectedChapter?.illustrationSeed && selectedChapter.illustrationSeed !== "nexus-core" && selectedChapter.illustrationSeed !== "awaiting-synthesis") {
      ws.setLastImageSeed(selectedChapter.illustrationSeed);
    }
  }, [selectedChapter?.illustrationSeed]);

  // Auto-create next chapter when minted
  const prevMintedRef = useRef(false);
  useEffect(() => {
    if (selectedChapter?.isMinted && !prevMintedRef.current && selectedChapter?.id && newChapterPrompt) {
      const timer = setTimeout(() => {
        ws.setGenerating(true);
        draftNewChapter(newChapterPrompt, styleLock, aspectRatio);
        ws.setNewChapterPrompt("");
        ws.setSelectedChapterId(null);
        ws.setChapterOrder([]);
      }, 500);
      prevMintedRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!selectedChapter?.isMinted) prevMintedRef.current = false;
  }, [selectedChapter?.isMinted, selectedChapter?.id, newChapterPrompt, styleLock, aspectRatio, draftNewChapter]);

  // ── Detect intent: "generate image" vs narrative refinement ──
  const isGenerateImageIntent = (text: string) => {
    const t = text.toLowerCase();
    return t.includes("generate image") || t.includes("create image") || t.includes("make image") || t.includes("draw image") || t.includes("render image") || t.includes("synthesize image");
  };

  // ── AI narrative refinement handler ──
  const handleNarrativeRefine = useCallback(async (instruction: string) => {
    if (!selectedChapter?.storyText) return;
    setIsRefiningNarrative(true);
    try {
      const response = await fetch(loreloomApiPath("/api/ai/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "groq",
          prompt: [
            `You are a collaborative narrative editor for a story engine.`,
            `Current chapter text:`,
            `"""`,
            selectedChapter.storyText,
            `"""`,
            ``,
            `User instruction: ${instruction}`,
            ``,
            `Rewrite or refine the chapter text based on the instruction above. Keep the same narrative voice and style. Output ONLY the revised story text — no preamble, no explanation, no quotes around it.`
          ].join("\n"),
          systemPrompt: "You are a creative narrative editor. Return only the refined story text, nothing else."
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          const refinedText = data.text.trim();
          setNarrativeText(refinedText);
          
          if (selectedChapter?.id && activeWorld?.id) {
            await loreloomFetch(loreloomApiPath(`/api/worlds/${activeWorld.id}/chapters/${selectedChapter.id}`), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: refinedText })
            });
          }
        }
      }
    } catch (err) {
      console.error("Narrative refine error:", err);
    } finally {
      setIsRefiningNarrative(false);
    }
  }, [selectedChapter?.storyText, selectedChapter?.id, activeWorld?.id]);

  // ── Handlers ──
  const handleDraftSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const prompt = newChapterPrompt.trim();
    if (!prompt || generating || isRefiningNarrative) return;

    // Detect "generate image" intent → show confirmation card instead of immediate generation
    if (isGenerateImageIntent(prompt) && selectedChapter?.id && !selectedChapter?.isMinted) {
      setShowGenConfirm(true);
      return;
    }

    // If there's a selected chapter with text → refine it via AI
    if (selectedChapter?.storyText) {
      handleNarrativeRefine(prompt);
      ws.setNewChapterPrompt("");
      return;
    }

    // No chapter yet → weave a new chapter
    ws.persistGenerationParams(prompt, styleLock, aspectRatio);
    ws.setGenerating(true);
    draftNewChapter(prompt, styleLock, aspectRatio);
    ws.setNewChapterPrompt("");
    ws.setSelectedChapterId(null);
    ws.setChapterOrder([]);
  }, [newChapterPrompt, styleLock, aspectRatio, draftNewChapter, generating, isRefiningNarrative, selectedChapter, regenerateChapterImage, handleNarrativeRefine, setShowGenConfirm]);

  const handleMintClick = useCallback((chapterId: string) => {
    ws.setIsMinting(chapterId);
    setTimeout(() => { commitChapterToCanon(chapterId); ws.setIsMinting(null); }, 2000);
  }, [commitChapterToCanon]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    ws.setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = chapterOrder.indexOf(active.id as string);
    const newIdx = chapterOrder.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(chapterOrder, oldIdx, newIdx);
    ws.setChapterOrder(reordered);
    reorderChapters(reordered);
  }, [chapterOrder, reorderChapters]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    ws.setActiveDragId(event.active.id as string);
  }, []);

  const handleSelectChapter = useCallback((id: string) => { ws.setSelectedChapterId(id); }, []);

  const handleDeleteChapter = useCallback((chapterId: string) => {
    ws.setSelectedChapterId(null);
    ws.setChapterOrder([]);
    deleteChapter(chapterId);
  }, [deleteChapter]);

  const handleVisualSynthesis = useCallback(() => {
    if (!selectedChapter?.id || !selectedChapter.storyText || selectedChapter.isMinted) return;
    ws.setGenerating(true);
    regenerateChapterImage(selectedChapter.id, {
      narrativeContext: selectedChapter.storyText,
      styleLock: styleLock ? "locked" : undefined,
      aspectRatio
    });
  }, [selectedChapter?.id, selectedChapter?.storyText, selectedChapter?.isMinted, styleLock, aspectRatio, regenerateChapterImage]);

  const handleVisualSynthesisRetrigger = useCallback(() => {
    if (!selectedChapter?.id || selectedChapter.isMinted) return;
    ws.setGenerating(true);
    regenerateChapterImage(selectedChapter.id, {
      narrativeContext: selectedChapter.storyText,
      styleLock: styleLock ? "locked" : undefined,
      aspectRatio
    });
  }, [selectedChapter?.id, selectedChapter?.isMinted, styleLock, aspectRatio, regenerateChapterImage]);

  if (!activeWorld) {
    return (
      <div style={{ ...s.workspace, ...s.centered, flexDirection: "column", gap: 16 }}>
        <div style={s.ambientLeft} />
        <div style={s.ambientRight} />
        <div className="flex items-center gap-3">
          <LucideLoader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <span className="text-sm font-medium text-purple-300 tracking-wide">Loading workspace...</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={canvasFullscreen ? { ...s.workspace, gap: 0 } : s.workspace}>
      {/* Ambient glows */}
      <div style={s.ambientLeft} />
      <div style={s.ambientRight} />

      {/* ── World Header ── */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" style={s.header}>
        <div>
          <h1 style={s.worldTitle}>{activeWorld.name}</h1>
          <p style={s.worldMeta}>{activeWorld.style} &middot; Creative Session Sandbox</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {selectedChapter?.isMinted ? (
            <span style={s.mintedBadge}><CheckCircle size={12} /> CANON MINTED</span>
          ) : selectedChapter && (
            <button onClick={() => handleMintClick(selectedChapter.id)} disabled={isMinting !== null} style={s.commitBtn}>
              <Database size={12} />
              {isMinting === selectedChapter.id ? "Committing..." : "Commit to Canon"}
            </button>
          )}
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════
          CANVAS-FIRST 2-COLUMN GRID
          ════════════════════════════════════════════════════════ */}
      <div style={canvasFullscreen ? { ...s.grid2col, display: "none" } : s.grid2col}>

        {/* ━━━ NARRATIVE ENGINE (Left) ━━━ */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" style={{ ...glass, ...s.narrativePanel }}>
          <div style={s.panelHeader}>
            <BookOpen size={14} color="#00D6FF" />
            <span style={s.panelLabel}>Narrative Engine</span>
            <span style={s.chapterBadge}>Ch {String(selectedChapter?.number ?? 1).padStart(2, "0")}</span>
            {generating && (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} style={{ display: "inline-flex", color: "#00D6FF", marginLeft: "4px" }}>
                <Loader2 size={12} />
              </motion.span>
            )}
          </div>

          <div style={s.storyFeed} className="hide-scrollbar">
            {(selectedChapter?.storyText || narrativeText) && (
              <div style={s.beatMarkerContainer}>
                <div style={s.beatMarkerLine} />
              </div>
            )}

            {selectedChapter ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingLeft: (selectedChapter.storyText || narrativeText) ? "14px" : "0" }}>
                {selectedChapter.status === "failed" && !selectedChapter.storyText && !narrativeText ? (
                  <div style={s.documentBlock}>
                    <div style={s.documentBlockLabel}>NARRATIVE BEAT</div>
                    <p style={{ color: "#ff6b6b", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
                      Generation failed. Try weaving this chapter again.
                    </p>
                  </div>
                ) : selectedChapter.storyText || narrativeText ? (
                  <div style={s.documentBlock}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={s.documentBlockLabel}>NARRATIVE BEAT</div>
                      {isRefiningNarrative && (
                        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
                          style={{ fontSize: "0.5rem", fontFamily: "var(--font-mono)", color: "#B026FF", letterSpacing: "0.1em" }}
                        >
                          AI EDITING...
                        </motion.span>
                      )}
                      {narrativeText && !isRefiningNarrative && (
                        <button
                          onClick={() => setNarrativeText(null)}
                          style={{ fontSize: "0.45rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em" }}
                          title="Discard AI edit"
                        >
                          REVERT
                        </button>
                      )}
                    </div>
                    <SimpleMarkdown text={narrativeText ?? selectedChapter.storyText ?? ""} />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px 0" }}>
                    <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ height: "16px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", width: "90%" }} />
                    <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} style={{ height: "16px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", width: "95%" }} />
                    <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} style={{ height: "16px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", width: "60%" }} />
                    <span style={{ fontSize: "0.75rem", color: "#D98FFF", fontFamily: "var(--font-mono)", marginTop: "10px", display: "inline-block", textShadow: "0 0 8px rgba(176,38,255,0.3)" }}>
                      Weaving narrative nodes...
                    </span>
                  </div>
                )}
                <div style={s.glassSeparator} />
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.83rem" }}>No chapter selected.</p>
            )}
          </div>

          {showGenConfirm && (
            <div style={{
              margin: "12px",
              padding: "14px",
              background: "rgba(10, 10, 15, 0.75)",
              border: "1px solid rgba(0, 214, 255, 0.35)",
              borderRadius: "8px",
              boxShadow: "0 0 15px rgba(0, 214, 255, 0.15)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "#00D6FF", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00D6FF", display: "inline-block", boxShadow: "0 0 8px #00D6FF" }} />
                CONFIRM VISUAL SYNTHESIS
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.7)", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: "6px", borderLeft: "2px solid rgba(176, 38, 255, 0.3)", paddingLeft: "8px" }}>
                <div><strong>Narrative:</strong> {selectedChapter?.storyText ? `${selectedChapter.storyText.slice(0, 110)}...` : "Empty chapter text"}</div>
                <div><strong>Style:</strong> {styleLock ? "Locked" : "Unlocked"} ({activeWorld?.style ?? "Default"})</div>
                <div><strong>Aspect Ratio:</strong> {aspectRatio}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowGenConfirm(false)}
                  style={{
                    padding: "4px 10px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "4px",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: "0.6rem",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGenConfirm(false);
                    if (selectedChapter?.id) {
                      ws.setGenerating(true);
                      regenerateChapterImage(selectedChapter.id, {
                        narrativeContext: selectedChapter.storyText,
                        styleLock: styleLock ? "locked" : undefined,
                        aspectRatio
                      });
                      ws.setNewChapterPrompt("");
                    }
                  }}
                  style={{
                    padding: "4px 10px",
                    background: "linear-gradient(135deg, rgba(0, 214, 255, 0.2), rgba(176, 38, 255, 0.2))",
                    border: "1px solid rgba(0, 214, 255, 0.4)",
                    borderRadius: "4px",
                    color: "#00D6FF",
                    fontSize: "0.6rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: "0 0 10px rgba(0,214,255,0.2)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,214,255,0.8)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(0,214,255,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,214,255,0.4)"; e.currentTarget.style.boxShadow = "0 0 10px rgba(0,214,255,0.2)"; }}
                >
                  PROCEED
                </button>
              </div>
            </div>
          )}

          {/* ─── Prompt box integrated at bottom of Narrative Engine ─── */}
          <form onSubmit={handleDraftSubmit} style={{
            ...s.narrativePromptForm,
            minHeight: promptExpanded ? "200px" : undefined,
            transition: "min-height 0.25s ease",
          }}>
            <div style={s.narrativePromptGlow} />
            <div style={s.narrativePromptHeader}>
              <span className="text-[10px] font-mono tracking-wider text-cyan-400/80 uppercase">
                {selectedChapter?.storyText
                  ? isGenerateImageIntent(newChapterPrompt)
                    ? "Generate Image"
                    : "Edit Narrative"
                  : "Weave a Beat"}
              </span>
              {isGenerateImageIntent(newChapterPrompt) && (
                <span className="bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-mono ml-2">
                  IMAGE
                </span>
              )}
              <button
                type="button"
                onClick={() => ws.setPromptExpanded(!promptExpanded)}
                title={promptExpanded ? "Collapse" : "Expand"}
                style={{
                  marginLeft: "auto",
                  width: "20px", height: "20px", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0, transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = "rgba(176,38,255,0.4)"; e.currentTarget.style.background = "rgba(176,38,255,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              >
                <LucidePlus size={14} className={`transition-transform duration-200 ${promptExpanded ? "rotate-45" : ""}`} />
              </button>
            </div>
            <textarea
              ref={promptRef}
              placeholder={
                selectedChapter?.storyText
                  ? `Edit the narrative, or say "generate image" to render the scene...`
                  : `What happens next for ${heroName || activeWorld?.protagonistName}...`
              }
              value={newChapterPrompt}
              onChange={(e) => {
                ws.setNewChapterPrompt(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onFocus={() => ws.setInputFocused(true)}
              onBlur={() => ws.setInputFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && newChapterPrompt.trim()) {
                  e.preventDefault();
                  handleDraftSubmit(e);
                }
              }}
              rows={1}
              style={{
                ...s.narrativePromptInput,
                minHeight: promptExpanded ? "120px" : "40px",
                maxHeight: "160px",
                overflow: "auto",
                resize: "none",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                boxShadow: "none",
              }}
              className="bg-background text-foreground border border-border rounded-lg focus:border-cyan-500/40 focus:outline-none focus:ring-0 transition-colors placeholder:text-muted-foreground text-sm font-sans"
            />
            <div style={s.narrativePromptFooter}>
              <ComplexityDot text={newChapterPrompt} />
              <div style={s.narrativeGenControls} className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => ws.setStyleLock(!styleLock)} 
                  className={`h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-mono border transition-all cursor-pointer
                    ${styleLock 
                      ? "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-950/50 dark:border-purple-500/30 dark:text-purple-300" 
                      : "bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900 dark:bg-white/[0.02] dark:border-white/10 dark:text-white/50 dark:hover:text-white"
                    }`}
                  title={styleLock ? "Style-Lock ON" : "Style-Lock OFF"}
                >
                  <LucideLock size={13} strokeWidth={1.5} />
                </button>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                      background: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                    className="h-7 px-3.5 flex justify-between items-center gap-2 rounded-md text-xs font-mono border cursor-pointer focus:outline-none focus:border-cyan-500/40 transition-all min-w-[135px] relative z-20"
                  >
                    <span style={{ color: "hsl(var(--foreground))" }}>{aspectRatio === "16:9" ? "16:9 (1024x576)" : aspectRatio === "1:1" ? "1:1 (1024x1024)" : "9:16 (576x1024)"}</span>
                    <ChevronDown size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  </button>
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                      <ul style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} className="absolute bottom-full left-0 mb-1 w-full border rounded-md shadow-lg z-40 overflow-hidden text-xs">
                        {[
                          { label: "16:9 (1024x576)", value: "16:9" },
                          { label: "1:1 (1024x1024)", value: "1:1" },
                          { label: "9:16 (576x1024)", value: "9:16" },
                        ].map((opt) => (
                          <li
                            key={opt.value}
                            onClick={() => {
                              ws.setAspectRatio(opt.value as AspectRatio);
                              setIsDropdownOpen(false);
                            }}
                            className={`px-2.5 py-1.5 cursor-pointer hover:bg-muted transition-colors ${aspectRatio === opt.value ? "font-semibold text-cyan-600 dark:text-cyan-400" : ""}`}
                          >
                            {opt.label}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <motion.button
                  type="submit"
                  disabled={!newChapterPrompt.trim() || isWeavingText || isRefiningNarrative}
                  whileTap={newChapterPrompt.trim() && !isWeavingText && !isRefiningNarrative ? { scale: 0.96 } : undefined}
                  className={`h-7 px-4 min-w-[80px] flex items-center justify-center gap-1.5 rounded-md font-medium text-base border transition-all 
                    ${newChapterPrompt.trim() && !isWeavingText && !isRefiningNarrative
                      ? "bg-purple-600 border-purple-500 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)] cursor-pointer"
                      : "bg-gray-100 dark:bg-purple-950/20 text-gray-500 dark:text-white/30 border-gray-200 dark:border-purple-950/40 shadow-none cursor-default"
                    }`}
                >
                  {(isWeavingText || isRefiningNarrative) ? (
                    <motion.span 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
                      className="inline-flex"
                    >
                      <LucideLoader2 size={15} />
                    </motion.span>
                  ) : (
                    <HiSparkles size={18} className={newChapterPrompt.trim() ? "text-white" : "text-gray-400 dark:text-white/30"} />
                  )}
                  <span>
                    {isWeavingText 
                      ? "Weaving..." 
                      : isRefiningNarrative 
                        ? "Editing..." 
                        : isGenerateImageIntent(newChapterPrompt) 
                          ? "Render" 
                          : selectedChapter?.storyText 
                            ? "Edit" 
                            : "Weave"}
                  </span>
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>

        {/* ━━━ MAIN CANVAS (Right) ━━━ */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" style={{ ...glass, ...s.canvasPanel }}>
          <div style={s.panelHeader}>
            <Cpu size={14} color="#00D6FF" />
            <span style={s.panelLabel}>Main Canvas</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
              <button onClick={() => ws.setCanvasFullscreen(!canvasFullscreen)} style={s.canvasActionBtn} title={canvasFullscreen ? "Exit fullscreen" : "Fullscreen canvas"}>
                {canvasFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            </div>
          </div>

          <div style={s.canvasViewport}>
            <div style={s.canvasGlow} />
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <VisualCanonGraphic
                seed={selectedChapter?.illustrationSeed || "awaiting-synthesis"}
                onRetrigger={selectedChapter?.isMinted ? undefined : handleVisualSynthesisRetrigger}
                previousSeed={lastImageSeed || undefined}
                isGenerating={generating && selectedChapter?.status === "text_ready"}
                progress={genProgress}
              />
            </div>
          </div>

          {/* Visual Synthesis button removed — use "generate image" in the prompt box */}
        </motion.div>
      </div>



      {/* ─── Fullscreen Canvas ─── */}
      <AnimatePresence>
        {canvasFullscreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ ...glass, ...s.fullscreenCanvas }}
          >
            <div style={s.panelHeader}>
              <Cpu size={16} color="#00D6FF" />
              <span style={s.panelLabel}>Main Canvas &mdash; Fullscreen View</span>
              <button onClick={() => ws.setCanvasFullscreen(false)} style={s.canvasActionBtn}><Minimize2 size={14} /></button>
            </div>
            <div style={{ flex: 1, borderRadius: "12px", overflow: "hidden", position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at center, rgba(176,38,255,0.08) 0%, transparent 70%)",
                pointerEvents: "none", zIndex: 1,
              }} />
              {selectedChapter ? (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <VisualCanonGraphic 
                    seed={selectedChapter.illustrationSeed} 
                    onRetrigger={selectedChapter.isMinted ? undefined : handleVisualSynthesisRetrigger} 
                    previousSeed={lastImageSeed || undefined} 
                    isGenerating={generating && selectedChapter?.status === "text_ready"}
                    progress={genProgress}
                  />
                </div>
              ) : (
                <div style={s.canvasPlaceholder}>
                  <Cpu size={48} />
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-mono)", marginTop: "8px" }}>&mdash; awaiting visual synthesis &mdash;</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════
          SEQUENCE TIMELINE (Full-width Bottom)
          ════════════════════════════════════════════════════════ */}
      <motion.div 
        variants={fadeUp} custom={3} initial="hidden" animate="visible" 
        style={{
          ...s.timeline,
          background: "var(--card-bg)",
          borderTop: "1px solid hsl(var(--border))",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: "none",
          borderRadius: 0,
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
      >
        <div style={s.timelineHeader} className="flex items-center gap-1.5">
          <LucideLayers size={14} className="text-cyan-400" strokeWidth={1.5} />
          <span style={s.timelineLabel}>Sequence Timeline</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            {orderedChapters.length} CHAPTER{orderedChapters.length !== 1 ? "S" : ""}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            <button onClick={() => { if (chapterIndex > 0) ws.setSelectedChapterId(orderedChapters[chapterIndex - 1].id); }} disabled={chapterIndex <= 0} style={s.timelineArrow}>
              <LucideChevronLeft size={13} strokeWidth={1.5} />
            </button>
            <button onClick={() => { if (chapterIndex < orderedChapters.length - 1) ws.setSelectedChapterId(orderedChapters[chapterIndex + 1].id); }} disabled={chapterIndex >= orderedChapters.length - 1} style={s.timelineArrow}>
              <LucideChevronRight size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div 
          style={{
            ...s.scrubTrack,
            gap: "8px",
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            padding: "6px 12px"
          }}
        >
          <div style={s.trackLine} className="opacity-10" />

          {orderedChapters.length === 0 ? (
            <div 
              onClick={() => {
                ws.setGenerating(true);
                draftNewChapter("", styleLock, aspectRatio);
                ws.setNewChapterPrompt("");
                ws.setSelectedChapterId(null);
                ws.setChapterOrder([]);
              }}
              className="group flex items-center justify-center h-11 w-28 rounded-lg border border-dashed border-gray-300 hover:border-cyan-400 bg-white/50 hover:bg-cyan-50 cursor-pointer transition-all duration-200 select-none mx-auto my-1 dark:border-white/20 dark:hover:border-cyan-400/50 dark:bg-white/[0.02] dark:hover:bg-cyan-500/[0.04]"
            >
              <LucidePlus size={14} className="opacity-60 group-hover:opacity-100 text-gray-500 transition-opacity dark:opacity-40 dark:text-white" strokeWidth={1.5} />
            </div>
          ) : (
            <DndContext id="chapter-sort" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedChapters.map((ch) => ch.id)} strategy={horizontalListSortingStrategy}>
                {orderedChapters.map((ch, idx) => (
                  <SortableChapterCard
                    key={ch.id}
                    chapter={ch}
                    isActive={ch.id === selectedChapter?.id}
                    chapterIndex={idx}
                    totalChapters={orderedChapters.length}
                    onClick={() => handleSelectChapter(ch.id)}
                    onDelete={() => handleDeleteChapter(ch.id)}
                  />
                ))}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    ws.setGenerating(true);
                    draftNewChapter("", styleLock, aspectRatio);
                    ws.setNewChapterPrompt("");
                    ws.setSelectedChapterId(null);
                    ws.setChapterOrder([]);
                  }}
                  disabled={generating}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "44px", height: "44px",
                    background: "hsl(var(--background))",
                    border: "1px dashed hsl(var(--border))",
                    borderRadius: "8px",
                    cursor: generating ? "default" : "pointer",
                    color: "hsl(var(--foreground))",
                    opacity: generating ? 0.4 : 1,
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  className="hover:border-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/[0.05]"
                  title="Create new chapter"
                >
                  <LucidePlus size={14} strokeWidth={1.5} />
                </motion.button>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeDragId && (() => {
                  const ch = orderedChapters.find((c) => c.id === activeDragId);
                  return ch ? (
                    <div 
                      className="flex items-center justify-center px-4 py-2 h-11 gap-3 rounded-lg bg-cyan-950/70 border border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.3)] scale-[0.98] select-none pointer-events-none"
                      style={{
                        height: "44px",
                      }}
                    >
                      <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300">
                        {String(ch.number).padStart(2, "0")}
                      </span>
                      <div className="flex items-center justify-center shrink-0 w-4 h-4">
                        <LucidePlay size={14} className="text-cyan-400 fill-cyan-400/30" strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center justify-end shrink-0">
                        {!ch.isMinted ? (
                          <LucideTrash2 size={14} className="text-white/30" strokeWidth={1.5} />
                        ) : (
                          <LucideDatabase size={14} className="text-emerald-400" strokeWidth={1.5} />
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </motion.div>

      {toast && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          background: toast.type === "success" 
            ? "linear-gradient(135deg, rgba(0, 214, 255, 0.15), rgba(0, 214, 255, 0.05))" 
            : "linear-gradient(135deg, rgba(255, 75, 75, 0.15), rgba(255, 75, 75, 0.05))",
          border: toast.type === "success" 
            ? "1px solid rgba(0, 214, 255, 0.4)" 
            : "1px solid rgba(255, 75, 75, 0.4)",
          borderRadius: "8px",
          padding: "12px 18px",
          color: toast.type === "success" ? "#00D6FF" : "#FF4B4B",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          boxShadow: toast.type === "success" 
            ? "0 0 20px rgba(0, 214, 255, 0.2)" 
            : "0 0 20px rgba(255, 75, 75, 0.2)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: toast.type === "success" ? "#00D6FF" : "#FF4B4B",
            boxShadow: toast.type === "success" ? "0 0 8px #00D6FF" : "0 0 8px #FF4B4B"
          }} />
          {toast.message}
        </div>
      )}

      {quotaError && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "rgba(20,20,25,0.95)", border: "1px solid rgba(255,180,30,0.3)",
            borderRadius: "14px", padding: "30px 36px", maxWidth: "420px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠</div>
            <h3 style={{ margin: "0 0 8px 0", color: "#FFD966", fontSize: "1rem", fontFamily: "var(--font-mono)" }}>AI Provider Hit Limit</h3>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", lineHeight: 1.5 }}>
              {quotaError.includes("Gemini") ? "Gemini API quota exceeded. Try using OpenRouter or NVIDIA, or wait for the quota to reset." : quotaError}
            </p>
            <button onClick={() => setQuotaError(null)} style={{
              marginTop: "18px", padding: "8px 20px", background: "rgba(255,180,30,0.15)",
              border: "1px solid rgba(255,180,30,0.3)", borderRadius: "8px", color: "#FFD966",
              cursor: "pointer", fontSize: "0.8rem", fontFamily: "var(--font-mono)",
            }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AspectRatio Icon ─── */
function AspectIcon({ ratio }: { ratio: AspectRatio }) {
  if (ratio === "16:9") return <LucideFilm size={13} />;
  if (ratio === "1:1") return <LucideSquare size={13} />;
  return <LucideSmartphone size={13} />;
}

/* ═══════════════════════════════════════════════
   PAGE EXPORT
   ═══════════════════════════════════════════════ */
export default function WorkspacePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={s.errorContainer}><span style={{ color: "#fff" }}>Loading Workspace...</span></div>}>
        <WorkspaceContent />
      </Suspense>
    </ErrorBoundary>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const s: Record<string, React.CSSProperties> = {
  /* ── Workspace container ── */
  workspace: {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100dvh",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "hsl(var(--background))",
  },

  /* ── Ambient glows ── */
  ambientLeft: {
    position: "absolute",
    top: "-80px",
    left: "-60px",
    width: 380,
    height: 380,
    background: "radial-gradient(circle, rgba(176,38,255,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  ambientRight: {
    position: "absolute",
    top: "40px",
    right: "-80px",
    width: 420,
    height: 420,
    background: "radial-gradient(circle, rgba(0,214,255,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },

  /* ── Header ── */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 10,
  },
  worldTitle: {
    fontSize: "1.45rem",
    fontWeight: 700,
    margin: 0,
    color: "hsl(var(--foreground))",
  },
  worldMeta: {
    fontSize: "0.68rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    margin: "2px 0 0 0",
  },

  /* ── Commit / minted ── */
  commitBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid rgba(0,214,255,0.3)",
    background: "linear-gradient(135deg, rgba(0,214,255,0.08), rgba(176,38,255,0.05))",
    color: "#79E4FF",
    cursor: "pointer",
    fontSize: "0.72rem",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    transition: "all 0.2s",
  },
  mintedBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "8px",
    background: "rgba(212,175,55,0.08)",
    border: "1px solid rgba(212,175,55,0.25)",
    color: "#D4AF37",
    fontSize: "0.65rem",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.03em",
  },

  /* ── Canvas-First 2-Column Grid ── */
  grid2col: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    flex: 1,
    minHeight: 0,
    zIndex: 10,
  },

  /* ── Narrative Engine ── */
  narrativePanel: {
    padding: "18px 20px 12px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
  },

  /* Beat Marker - neon-cyan line */
  beatMarkerContainer: {
    position: "absolute",
    left: "20px",
    top: "60px",
    bottom: "110px",
    width: "2px",
    zIndex: 5,
    pointerEvents: "none",
  },
  beatMarkerLine: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(180deg, #00D6FF, rgba(0,214,255,0.1))",
    borderRadius: "1px",
    boxShadow: "0 0 8px rgba(0,214,255,0.4)",
  },

  storyFeed: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "10px",
    paddingRight: "2px",
    position: "relative",
  },

  /* Document-style blocks */
  documentBlock: {
    background: "var(--card-bg)",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "12px 14px",
  },
  documentBlockLabel: {
    fontSize: "0.52rem",
    fontFamily: "var(--font-mono)",
    color: "rgba(0,214,255,0.5)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginBottom: "6px",
    fontWeight: 600,
  },
  glassSeparator: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(176,38,255,0.15), rgba(0,214,255,0.15), transparent)",
    margin: "4px 0",
  },

  /* ── Narrative Engine Prompt Form ── */
  narrativePromptForm: {
    position: "relative",
    marginTop: "10px",
    padding: "12px 14px 10px",
    background: "var(--card-bg)",
    borderRadius: "12px",
    border: "1px solid hsl(var(--border))",
    flexShrink: 0,
  },
  narrativePromptGlow: {
    position: "absolute",
    top: "-40px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "120px",
    height: "80px",
    background: "radial-gradient(ellipse, rgba(176,38,255,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  narrativePromptHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  narrativePromptLabel: {
    fontSize: "0.55rem",
    fontFamily: "var(--font-mono)",
    color: "rgba(0,214,255,0.5)",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    fontWeight: 600,
  },
  contextLoadedBadge: {
    fontSize: "0.48rem",
    fontFamily: "var(--font-mono)",
    color: "rgba(176,38,255,0.5)",
    letterSpacing: "0.06em",
    background: "rgba(176,38,255,0.08)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  narrativePromptInput: {
    width: "100%",
    background: "hsl(var(--background))",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "hsl(var(--border))",
    borderRadius: "10px",
    outline: "none",
    color: "hsl(var(--foreground))",
    fontSize: "0.8rem",
    padding: "8px 12px",
    fontFamily: "Inter, var(--font-sans), sans-serif",
    boxSizing: "border-box" as const,
    lineHeight: 1.5,
    resize: "vertical" as const,
    minHeight: "52px",
    maxHeight: "120px",
    transition: "border-color 0.25s, box-shadow 0.25s",
  },
  narrativePromptFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "6px",
    marginTop: "8px",
    flexWrap: "wrap",
  },
  narrativeGenControls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: "auto",
  },
  narrativeGenBtn: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    padding: "4px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "var(--font-sans)",
    border: "none",
  },
  narrativeWeaveBtn: {
    background: "linear-gradient(135deg, rgba(176,38,255,0.2), rgba(0,214,255,0.12))",
    border: "1px solid rgba(176,38,255,0.35)",
    borderRadius: "7px",
    color: "#fff",
    padding: "5px 12px",
    fontSize: "0.68rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    transition: "all 0.2s",
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.04em",
  },

  /* ── Main Canvas ── */
  canvasPanel: {
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    position: "relative",
  },

  synthesisBtn: {
    width: "100%",
    marginTop: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 0",
    borderRadius: "8px",
    border: "1px solid rgba(0,214,255,0.2)",
    background: "linear-gradient(135deg, rgba(0,214,255,0.06), rgba(176,38,255,0.03))",
    color: "#79E4FF",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    transition: "all 0.2s",
    letterSpacing: "0.04em",
  },

  canvasViewport: {
    flex: "0 1 auto",
    width: "100%",
    aspectRatio: "16 / 9",
    maxHeight: "100%",
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    overflow: "hidden",
    position: "relative",
  },
  canvasGlow: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(ellipse at center, rgba(176,38,255,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 1,
  },
  canvasPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
  canvasActionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 6px",
    borderRadius: "6px",
    border: "none",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.3)",
    cursor: "pointer",
    transition: "all 0.2s",
  },



  /* ── Fullscreen Canvas ── */
  fullscreenCanvas: {
    position: "absolute",
    inset: "24px 28px",
    zIndex: 50,
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    background: "var(--card-bg)",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    border: "1px solid hsl(var(--border))",
    borderRadius: "16px",
  },

  /* ── Timeline ── */
  timeline: {
    padding: "14px 20px",
    zIndex: 10,
  },
  timelineHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  timelineLabel: {
    fontSize: "0.62rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    fontWeight: 600,
  },
  timelineArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px",
    borderRadius: "6px",
    border: "1px solid hsl(var(--border))",
    background: "var(--card-bg)",
    color: "hsl(var(--foreground))",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  scrubTrack: {
    display: "flex",
    gap: "16px",
    overflowX: "auto",
    paddingBottom: "4px",
    minHeight: "52px",
    alignItems: "center",
    position: "relative",
  },
  trackLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: "1px",
    background: "hsl(var(--border))",
    zIndex: 0,
    pointerEvents: "none",
  },

  /* ── Shared panel styles ── */
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "10px",
    marginBottom: "10px",
  },
  panelLabel: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "hsl(var(--foreground))",
    flex: 1,
  },
  chapterBadge: {
    fontSize: "0.62rem",
    fontFamily: "var(--font-mono)",
    color: "#C084FC",
    background: "rgba(176,38,255,0.1)",
    padding: "3px 8px",
    borderRadius: "6px",
    letterSpacing: "0.04em",
  },
};
