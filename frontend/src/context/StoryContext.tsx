"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useWorldStore } from "../store/useWorldStore";
import { createClient } from "@/lib/supabase/client";

export interface Chapter {
  id: string;
  number: number;
  title: string;
  storyText: string;
  illustrationSeed: string; // Used to render unique SVG layouts or holds actual image URL
  isMinted: boolean;
  mintData?: {
    tokenId: string;
    txHash: string;
    ipfsHash: string;
    blockNumber: number;
    timestamp: string;
  };
  prompt: string; // The prompt input that generated this chapter
  status?: string;
}

export interface World {
  id: string;
  name: string;
  premise: string;
  style: string; // Cyberpunk, High Fantasy, Steampunk, Solar-punk, etc.
  protagonistName: string;
  protagonistDesc: string;
  relicName: string;
  createdAt: string;
  status: string; // "draft", "portrait_ready", "locked", "active", etc.
  referenceImageUrl?: string | null;
  chapters: Chapter[];
}

interface StoryContextType {
  worlds: World[];
  activeWorldId: string | null;
  activeWorld: World | null;
  createWorld: (
    name: string,
    premise: string,
    style: string,
    protagonistName: string,
    protagonistDesc: string,
    relicName: string
  ) => Promise<string>;
  draftNewChapter: (prompt: string, styleLock?: boolean, aspectRatio?: string) => void;
  regenerateChapterImage: (chapterId: string, options?: { narrativeContext?: string; styleLock?: string; aspectRatio?: string }) => Promise<void>;
  commitChapterToCanon: (chapterId: string) => void;
  switchWorld: (worldId: string) => void;
  deleteWorld: (worldId: string) => void;
  deleteChapter: (chapterId: string) => Promise<void>;
  fetchWorld: (worldId: string) => Promise<boolean>;
  reorderChapters: (chapterIds: string[]) => void;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const WALLET_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS || "0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467";

// Backend API response shapes for type-safe mapping
interface BackendWorldRow {
  id: string;
  title: string | null;
  intake: Record<string, unknown>;
  character_sheet: Record<string, unknown>;
  style_lock: string | null;
  created_at: string;
  status: string;
  reference_image_url: string | null;
}

interface BackendChapterRow {
  id: string;
  chapter_index: number;
  content: string | null;
  image_url: string | null;
  scene_description: string | null;
  status: string;
  chapter_token_id: string | null;
}

function mapBackendWorld(backendWorld: BackendWorldRow, backendChapters: BackendChapterRow[]): World {
  const intake = backendWorld.intake || {};
  const charSheet = backendWorld.character_sheet || {};
  
  return {
    id: backendWorld.id,
    name: backendWorld.title || (intake.name as string) || "Untitled World",
    premise: (intake.prompt as string) || (intake.premise as string) || "No premise.",
    style: backendWorld.style_lock || (intake.style as string) || "Default",
    protagonistName: (charSheet.name as string) || (intake.protagonistName as string) || "Unnamed",
    protagonistDesc: (charSheet.characterSummary as string) || (intake.protagonistDesc as string) || "No description.",
    relicName: (intake.relicName as string) || "None",
    createdAt: backendWorld.created_at,
    status: backendWorld.status,
    referenceImageUrl: backendWorld.reference_image_url,
    chapters: (backendChapters || []).map((ch, idx) => ({
      id: ch.id,
      number: idx + 1,
      title: `Chapter ${idx + 1}`,
      storyText: ch.content || "AI is weaving the chapter story...",
      illustrationSeed: ch.image_url || (ch.status === "failed" ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" : "awaiting-synthesis"),
      isMinted: ch.status === "minted" || ch.chapter_token_id !== null,
      prompt: ch.scene_description || "Generated beat",
      status: ch.status
    }))
  };
}

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Each user has their own isolated projects list; default is empty [] for new users
  const [worlds, setWorlds] = useState<World[]>([]);
  const [activeWorldId, setActiveWorldId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const setHeroName = useWorldStore((s) => s.setHeroName);

  // Sync Supabase user authentication session
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();

    const syncUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentId = user ? user.id : (localStorage.getItem("loreloom_active_wallet") || null);
      setUserId(currentId);
    };

    syncUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentId = session?.user ? session.user.id : (localStorage.getItem("loreloom_active_wallet") || null);
      setUserId(currentId);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch single world details helper
  const fetchWorld = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/worlds/${id}`);
      if (!response.ok) throw new Error("Failed to fetch world details");
      const data = await response.json();
      
      const mapped = mapBackendWorld(data.world, data.chapters);
      setWorlds((prev) => {
        const filtered = prev.filter((w) => w.id !== id);
        return [mapped, ...filtered];
      });
      return true;
    } catch (error: any) {
      if (error?.message === "Failed to fetch") {
        console.warn(`[StoryContext] Network offline or suspended while fetching world ${id}.`);
      } else {
        console.warn("Error fetching world details:", error);
      }
      return false;
    }
  }, []);

  // Load isolated projects per logged-in user
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!userId) {
      setWorlds([]);
      setActiveWorldId(null);
      setIsLoaded(true);
      return;
    }

    const loadUserWorlds = async () => {
      try {
        const response = await fetch(`${API_URL}/api/worlds?creatorId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.worlds) && data.worlds.length > 0) {
            const mappedWorlds = data.worlds.map((w: any) => mapBackendWorld(w, w.chapters || []));
            setWorlds(mappedWorlds);
            setActiveWorldId((prev) => (prev && mappedWorlds.some((mw: World) => mw.id === prev) ? prev : mappedWorlds[0].id));
            setIsLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn("[StoryContext] Error loading backend user worlds:", err);
      }

      // Namespaced local fallback for current user
      const userStorageKey = `loreloom_worlds_${userId}`;
      const userActiveKey = `loreloom_active_world_id_${userId}`;
      const savedWorlds = localStorage.getItem(userStorageKey);
      const savedActiveId = localStorage.getItem(userActiveKey);

      if (savedWorlds) {
        try {
          const parsed = JSON.parse(savedWorlds);
          setWorlds(parsed);
          if (savedActiveId) setActiveWorldId(savedActiveId);
        } catch (e) {
          console.error("Failed to parse saved user worlds", e);
          setWorlds([]);
          setActiveWorldId(null);
        }
      } else {
        // New user has 0 projects by default
        setWorlds([]);
        setActiveWorldId(null);
      }
      setIsLoaded(true);
    };

    loadUserWorlds();
  }, [userId]);

  // Auto-fetch activeWorld details if not in worlds list yet
  useEffect(() => {
    if (activeWorldId && !worlds.some((w) => w.id === activeWorldId)) {
      fetchWorld(activeWorldId);
    }
  }, [activeWorldId, worlds, fetchWorld]);

  // Persist isolated user state metadata
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined" && userId) {
      const userStorageKey = `loreloom_worlds_${userId}`;
      const userActiveKey = `loreloom_active_world_id_${userId}`;

      localStorage.setItem(userStorageKey, JSON.stringify(worlds));
      if (activeWorldId) {
        localStorage.setItem(userActiveKey, activeWorldId);
      } else {
        localStorage.removeItem(userActiveKey);
      }
    }
  }, [worlds, activeWorldId, isLoaded, userId]);

  // Background sync/polling for active world with exponential backoff
  useEffect(() => {
    if (!activeWorldId) {
      return;
    }

    let isMounted = true;
    let timerId: NodeJS.Timeout;
    let pollInterval = 3000;
    const maxInterval = 30000;

    const pollActiveWorld = async () => {
      const currentWorld = worlds.find((w) => w.id === activeWorldId);
      const hasPendingChapters = currentWorld?.chapters.some(
        (ch) => ch.illustrationSeed === "awaiting-synthesis" || ch.status === "generating"
      );

      if (hasPendingChapters || currentWorld?.status === "generating" || currentWorld?.status === "draft") {
        const success = await fetchWorld(activeWorldId);
        if (success) {
          pollInterval = 3000;
        } else {
          pollInterval = Math.min(pollInterval * 1.5, maxInterval);
        }
      } else {
        pollInterval = 10000;
      }

      if (isMounted) {
        timerId = setTimeout(pollActiveWorld, pollInterval);
      }
    };

    timerId = setTimeout(pollActiveWorld, pollInterval);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [activeWorldId, worlds, fetchWorld]);

  const activeWorld = worlds.find((w) => w.id === activeWorldId) || (worlds.length > 0 ? worlds[0] : null);

  // Sync protagonist name to Zustand store whenever activeWorld changes
  useEffect(() => {
    if (activeWorld?.protagonistName) {
      setHeroName(activeWorld.protagonistName);
    }
  }, [activeWorld, setHeroName]);

  const createWorld = async (
    name: string,
    premise: string,
    style: string,
    protagonistName: string,
    protagonistDesc: string,
    relicName: string
  ): Promise<string> => {
    const response = await fetch(`${API_URL}/api/worlds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId: userId || WALLET_ADDRESS,
        walletAddress: userId || WALLET_ADDRESS,
        title: name,
        intake: {
          name,
          prompt: premise,
          style,
          protagonistName,
          protagonistDesc,
          relicName
        },
        styleLock: style
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error ?? "Failed to create world");
    }

    const data = await response.json();
    const mapped = mapBackendWorld(data.world, []);
    setWorlds((prev) => [mapped, ...prev]);
    setActiveWorldId(mapped.id);
    return mapped.id;
  };

  const regenerateChapterImage = async (
    chapterId: string,
    options?: { narrativeContext?: string; styleLock?: string; aspectRatio?: string }
  ) => {
    if (!activeWorldId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/worlds/${activeWorldId}/chapters/${chapterId}/regenerate-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options || {})
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to trigger image regeneration");
      }

      setWorlds((prev) =>
        prev.map((world) => {
          if (world.id !== activeWorldId) return world;
          return {
            ...world,
            chapters: world.chapters.map((ch) =>
              ch.id === chapterId ? { ...ch, illustrationSeed: "awaiting-synthesis", status: "generating" } : ch
            )
          };
        })
      );
    } catch (err: any) {
      console.warn("Failed backend image regeneration:", err);
    }
  };

  const deleteChapter = async (chapterId: string) => {
    if (!activeWorldId) return;

    try {
      const response = await fetch(`${API_URL}/api/worlds/${activeWorldId}/chapters/${chapterId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Failed to delete chapter");
      }
    } catch (err) {
      console.warn("Failed backend chapter deletion:", err);
    }

    setWorlds((prev) =>
      prev.map((world) => {
        if (world.id !== activeWorldId) return world;
        return {
          ...world,
          chapters: world.chapters.filter((ch) => ch.id !== chapterId)
        };
      })
    );
  };

  const draftNewChapter = async (prompt: string, styleLock?: boolean, aspectRatio?: string) => {
    if (!activeWorldId) return;

    try {
      const response = await fetch(`${API_URL}/api/worlds/${activeWorldId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, styleLock, aspectRatio })
      });

      if (!response.ok) {
        throw new Error("Failed to create chapter");
      }

      const data = await response.json();
      fetchWorld(activeWorldId);
    } catch (err) {
      console.warn("Failed to draft chapter via backend API:", err);
    }
  };

  const commitChapterToCanon = (chapterId: string) => {
    setWorlds((prev) =>
      prev.map((world) => {
        if (world.id !== activeWorldId) return world;
        return {
          ...world,
          chapters: world.chapters.map((ch) => {
            if (ch.id !== chapterId) return ch;
            return {
              ...ch,
              isMinted: true,
              mintData: {
                tokenId: `0x${Math.floor(Math.random() * 65535).toString(16)}`,
                txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
                ipfsHash: `Qm${Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
                blockNumber: 19845000 + Math.floor(Math.random() * 1000),
                timestamp: new Date().toISOString()
              }
            };
          })
        };
      })
    );
  };

  const switchWorld = (worldId: string) => {
    setActiveWorldId(worldId);
  };

  const deleteWorld = (worldId: string) => {
    setWorlds((prev) => {
      const nextWorlds = prev.filter((w) => w.id !== worldId);
      if (activeWorldId === worldId) {
        setActiveWorldId(nextWorlds.length > 0 ? nextWorlds[0].id : null);
      }
      return nextWorlds;
    });
  };

  const reorderChapters = (chapterIds: string[]) => {
    setWorlds((prev) =>
      prev.map((world) => {
        if (world.id !== activeWorldId) return world;
        const chapterMap = new Map(world.chapters.map((ch) => [ch.id, ch]));
        const reordered = chapterIds
          .map((id) => chapterMap.get(id))
          .filter((ch): ch is Chapter => ch !== undefined)
          .map((ch, idx) => ({ ...ch, number: idx + 1 }));

        return {
          ...world,
          chapters: reordered
        };
      })
    );
  };

  return (
    <StoryContext.Provider
      value={{
        worlds,
        activeWorldId,
        activeWorld,
        createWorld,
        draftNewChapter,
        regenerateChapterImage,
        commitChapterToCanon,
        switchWorld,
        deleteWorld,
        deleteChapter,
        fetchWorld,
        reorderChapters
      }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = () => {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error("useStory must be used within a StoryProvider");
  }
  return context;
};
