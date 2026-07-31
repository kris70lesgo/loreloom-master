import { z } from "zod";
import type { AiProvider } from "@/server/config";
import { getSupabaseAdmin } from "@/server/db/supabase";
import type { ChapterRow, JsonValue, WorldRow } from "@/server/db/types";
import { HttpError, isUniqueViolation } from "@/server/http/errors";
import { enqueueJob, enqueueJobIfMissing } from "@/server/services/jobs";
import { getOrCreateUser } from "@/server/services/users";

export const intakeSchema = z.record(z.unknown()).default({});

export async function createWorld(input: {
  walletAddress: string;
  title?: string;
  intake?: Record<string, unknown>;
  styleLock?: string;
  aiProvider?: AiProvider;
}) {
  const user = await getOrCreateUser(input.walletAddress);
  const supabase = getSupabaseAdmin();
  const intake = input.intake ?? {};

  const { data: world, error } = await supabase
    .from("worlds")
    .insert({
      creator_id: user.id,
      title: input.title,
      intake,
      character_sheet: {},
      style_lock: input.styleLock ?? (typeof intake.style === "string" ? intake.style : null),
      status: "draft"
    })
    .select("*")
    .single();

  if (error || !world) {
    throw new HttpError(500, error?.message ?? "Could not create world.");
  }

  const job = await enqueueJob({
    jobType: "genesis.generate",
    worldId: world.id,
    payload: { reason: "initial", provider: input.aiProvider ?? "openrouter" }
  });

  return { user, world: world as WorldRow, job };
}

export async function regeneratePortrait(worldId: string) {
  const supabase = getSupabaseAdmin();
  const { count, error: countError } = await supabase
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("world_id", worldId)
    .eq("job_type", "portrait.generate");

  if (countError) {
    throw new HttpError(500, countError.message);
  }

  if ((count ?? 0) >= 3) {
    throw new HttpError(429, "Portrait regeneration limit reached for this world.");
  }

  const world = await getWorldRow(worldId);
  const job = await enqueueJob({
    jobType: "portrait.generate",
    worldId: world.id,
    payload: { reason: "regenerate" }
  });

  return { world, job };
}

export async function retryGenesisGeneration(worldId: string) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);

  if (world.reference_image_url || world.genesis_token_id) {
    throw new HttpError(409, "Genesis canon is already established for this world.");
  }

  const job = await enqueueJobIfMissing({
    jobType: "genesis.generate",
    worldId: world.id,
    payload: { reason: "retry", provider: "openrouter" }
  });
  const { error } = await supabase.from("worlds").update({ status: "draft" }).eq("id", world.id);
  if (error) {
    throw new HttpError(500, error.message);
  }

  return { world: await getWorldRow(world.id), job, message: "Let's refine that character world before it becomes permanent." };
}

export async function confirmWorld(worldId: string) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);

  if (world.status !== "portrait_ready" || !world.reference_image_url) {
    if (world.reference_image_url) {
      // Self-healing: if the reference image is already present, heal the status and proceed
      const { error: healError } = await supabase
        .from("worlds")
        .update({ status: "portrait_ready" })
        .eq("id", world.id);
      if (healError) {
        throw new HttpError(500, healError.message);
      }
    } else {
      // Use fallback placeholder image so user can access workspace and generate images there
      const placeholderUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=512&h=512&fit=crop";
      const { error: healError } = await supabase
        .from("worlds")
        .update({ 
          status: "portrait_ready",
          reference_image_url: placeholderUrl
        })
        .eq("id", world.id);
      if (healError) {
        throw new HttpError(500, healError.message);
      }
      world.reference_image_url = placeholderUrl;
      world.status = "portrait_ready";
    }
  }

  const { data: existingJob, error: existingError } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("world_id", world.id)
    .eq("job_type", "genesis.mint")
    .in("status", ["queued", "retrying", "processing", "succeeded"])
    .maybeSingle();

  if (existingError) {
    throw new HttpError(500, existingError.message);
  }

  await supabase.from("worlds").update({ status: "locked" }).eq("id", world.id);

  const job =
    existingJob ??
    (await enqueueJob({
      jobType: "genesis.mint",
      worldId: world.id
    }));

  return { world: await getWorldRow(world.id), job };
}

export async function createNextChapter(worldId: string) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);

  const { data: latest, error: latestError } = await supabase
    .from("chapters")
    .select("chapter_index")
    .eq("world_id", world.id)
    .order("chapter_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new HttpError(500, latestError.message);
  }

  const chapterIndex = ((latest?.chapter_index as number | undefined) ?? 0) + 1;

  // Banner reels are unlimited for authenticated users during the hackathon demo.
  // This restriction was removed to allow infinite chapter expansion.
  console.log(`[demo] Creating chapter ${chapterIndex} for world ${worldId}.`);

  const { data: chapter, error } = await supabase
    .from("chapters")
    .insert({
      world_id: world.id,
      chapter_index: chapterIndex,
      status: "draft"
    })
    .select("*")
    .single();

  if (error || !chapter) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "A chapter is already being created for this index.");
    }
    throw new HttpError(500, error?.message ?? "Could not create chapter.");
  }

  const job = await enqueueJob({
    jobType: "chapter.generate",
    worldId: world.id,
    chapterId: chapter.id
  });

  return { world, chapter: chapter as ChapterRow, job };
}

/**
 * Persists an image produced outside the queued chapter pipeline (for example,
 * a live procurement run) as a real chapter artifact.  Keeping this here means
 * the image remains available after a refresh and in the visual gallery.
 */
export async function saveProductionImage(input: {
  worldId: string;
  prompt: string;
  imageUrl: string;
}): Promise<ChapterRow> {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(input.worldId);

  const { data: latest, error: latestError } = await supabase
    .from("chapters")
    .select("chapter_index")
    .eq("world_id", world.id)
    .order("chapter_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new HttpError(500, latestError.message);
  }

  const { data: chapter, error } = await supabase
    .from("chapters")
    .insert({
      world_id: world.id,
      chapter_index: ((latest?.chapter_index as number | undefined) ?? 0) + 1,
      content: input.prompt,
      scene_description: input.prompt,
      image_url: input.imageUrl,
      status: "image_ready"
    })
    .select("*")
    .single();

  if (error || !chapter) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "Another production artifact was saved concurrently. Please run production again.");
    }
    throw new HttpError(500, error?.message ?? "Could not save the generated image.");
  }

  return chapter as ChapterRow;
}

export async function regenerateChapterImage(
  worldId: string,
  chapterId: string,
  options?: { narrativeContext?: string; styleLock?: string; aspectRatio?: string }
) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);
  const chapter = await getChapterRow(chapterId);

  if (chapter.world_id !== world.id) {
    throw new HttpError(404, "Chapter not found in this world.");
  }

  if (chapter.chapter_token_id) {
    throw new HttpError(409, "A minted chapter's image cannot be regenerated.");
  }

  const { error: updateError } = await supabase
    .from("chapters")
    .update({ image_url: null, status: "text_ready" })
    .eq("id", chapter.id);

  if (updateError) {
    throw new HttpError(500, updateError.message);
  }

  const jobType = chapter.content && chapter.scene_description ? "chapter.image" : "chapter.generate";

  const payload: Record<string, unknown> = {};
  if (options?.narrativeContext) payload.narrativeContext = options.narrativeContext;
  if (options?.styleLock) payload.styleLock = options.styleLock;
  if (options?.aspectRatio) payload.aspectRatio = options.aspectRatio;

  const job = await enqueueJob({ jobType, worldId: world.id, chapterId: chapter.id, payload: payload as JsonValue });
  return { world, chapter: await getChapterRow(chapter.id), job };
}

export async function retryChapterGeneration(worldId: string, chapterId: string) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);
  const chapter = await getChapterRow(chapterId);

  if (chapter.world_id !== world.id) {
    throw new HttpError(404, "Chapter not found in this world.");
  }

  if (chapter.chapter_token_id) {
    throw new HttpError(409, "A minted chapter cannot be regenerated.");
  }

  const jobType = chapter.content && chapter.scene_description ? "chapter.image" : "chapter.generate";
  const { error } = await supabase.from("chapters").update({ status: "draft" }).eq("id", chapter.id);
  if (error) {
    throw new HttpError(500, error.message);
  }

  const job = await enqueueJobIfMissing({ jobType, worldId: world.id, chapterId: chapter.id });
  return { world, chapter: await getChapterRow(chapter.id), job, message: "Let's try that scene differently before it becomes permanent." };
}

export async function getWorldDetails(worldId: string) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);
  const { data: chapters, error: chapterError } = await supabase
    .from("chapters")
    .select("*")
    .eq("world_id", world.id)
    .order("chapter_index", { ascending: true });

  if (chapterError) {
    throw new HttpError(500, chapterError.message);
  }

  return {
    world,
    chapters: (chapters ?? []) as ChapterRow[]
  };
}

export async function getCanon(worldId: string) {
  const supabase = getSupabaseAdmin();
  const { world, chapters } = await getWorldDetails(worldId);
  const { data: mints, error: mintError } = await supabase
    .from("mint_transactions")
    .select("*")
    .eq("world_id", world.id)
    .order("created_at", { ascending: true });

  if (mintError) {
    throw new HttpError(500, mintError.message);
  }

  return {
    world,
    chapters,
    mintTransactions: mints ?? []
  };
}

export async function deleteChapter(worldId: string, chapterId: string) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);

  // Check if chapter exists and is not minted before deleting
  const { data: chapter, error: fetchError } = await supabase
    .from("chapters")
    .select("id, world_id, chapter_token_id")
    .eq("id", chapterId)
    .maybeSingle();

  if (fetchError) {
    throw new HttpError(500, fetchError.message);
  }

  if (!chapter) {
    throw new HttpError(404, "Chapter not found.");
  }

  if (chapter.world_id !== world.id) {
    throw new HttpError(404, "Chapter not found in this world.");
  }

  if (chapter.chapter_token_id) {
    throw new HttpError(409, "A minted chapter cannot be deleted.");
  }

  const { error } = await supabase.from("chapters").delete().eq("id", chapter.id);

  if (error) {
    throw new HttpError(500, error.message);
  }

  return { world: await getWorldRow(world.id) };
}

export async function updateChapterContent(
  worldId: string,
  chapterId: string,
  content: string,
  sceneDescription?: string
) {
  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(worldId);
  const chapter = await getChapterRow(chapterId);

  if (chapter.world_id !== world.id) {
    throw new HttpError(404, "Chapter not found in this world.");
  }

  const updateData: Record<string, any> = {
    content: content,
    status: "text_ready"
  };
  if (sceneDescription) {
    updateData.scene_description = sceneDescription;
  }

  let characterSheet = world.character_sheet;
  try {
    const { generateText } = await import("@/server/ai/providers");
    const result = await generateText({
      provider: "openrouter",
      prompt: `You are a story engine analyzer. Look at this updated chapter text:\n"""\n${content}\n"""\n\nIdentify the protagonist's name. Return ONLY the name (1-2 words), nothing else. If you cannot identify the name, return "NONE".`,
      systemPrompt: "Return only the protagonist's name, nothing else."
    });
    const extractedName = result.text?.trim();
      if (extractedName && extractedName !== "NONE" && extractedName.length < 50) {
        if (typeof characterSheet === "object" && characterSheet !== null && !Array.isArray(characterSheet)) {
          const cs = { ...characterSheet } as Record<string, any>;
          if (cs.name !== extractedName) {
            console.log(`[memory] Protagonist name updated from ${cs.name} to ${extractedName}`);
            cs.name = extractedName;
            characterSheet = cs;
            
            await supabase
              .from("worlds")
              .update({ character_sheet: characterSheet })
              .eq("id", world.id);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[memory] Failed to auto-update protagonist name memory:", err);
  }

  const { error: updateError } = await supabase
    .from("chapters")
    .update(updateData)
    .eq("id", chapter.id);

  if (updateError) {
    throw new HttpError(500, updateError.message);
  }

  return { world: await getWorldRow(world.id), chapter: await getChapterRow(chapter.id) };
}

export async function getWorldRow(worldId: string): Promise<WorldRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("worlds").select("*").eq("id", worldId).single();

  if (error || !data) {
    throw new HttpError(error?.code === "PGRST116" ? 404 : 500, error?.message ?? "World not found.");
  }

  return data as WorldRow;
}

export async function getChapterRow(chapterId: string): Promise<ChapterRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("chapters").select("*").eq("id", chapterId).single();

  if (error || !data) {
    throw new HttpError(error?.code === "PGRST116" ? 404 : 500, error?.message ?? "Chapter not found.");
  }

  return data as ChapterRow;
}

export async function listUserWorlds(creatorIdOrWallet: string) {
  const supabase = getSupabaseAdmin();
  
  let userId = creatorIdOrWallet;
  if (creatorIdOrWallet.startsWith("0x")) {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", creatorIdOrWallet.toLowerCase())
      .maybeSingle();
    if (user) {
      userId = user.id;
    }
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  if (!isUuid) {
    return { worlds: [] };
  }

  const { data: worlds, error } = await supabase
    .from("worlds")
    .select("*, chapters(*)")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message);
  }

  return { worlds: worlds || [] };
}

export async function deleteWorld(worldId: string) {
  const supabase = getSupabaseAdmin();
  
  // Verify world exists
  const { data: world, error: fetchError } = await supabase
    .from("worlds")
    .select("id")
    .eq("id", worldId)
    .single();

  if (fetchError || !world) {
    throw new HttpError(404, "World not found.");
  }

  // Explicitly delete related records to prevent FK constraints issues if CASCADE is missing
  await supabase.from("generation_jobs").delete().eq("world_id", worldId);
  await supabase.from("procurements").delete().eq("world_id", worldId);
  await supabase.from("chapters").delete().eq("world_id", worldId);

  // Delete the world.
  const { error: deleteError } = await supabase
    .from("worlds")
    .delete()
    .eq("id", worldId);

  if (deleteError) {
    throw new HttpError(500, deleteError.message);
  }

  return { success: true };
}
