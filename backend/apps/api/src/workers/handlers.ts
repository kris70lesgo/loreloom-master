import { getSupabaseAdmin } from "../db/supabase.js";
import { AiBlockedError } from "../ai/errors.js";
import type { GenerationJobRow } from "../db/types.js";
import { generateChapterImageUrl, generatePortraitUrl } from "../services/images.js";
import { pinJson } from "../services/ipfs.js";
import { enqueueJobIfMissing, markJobSucceeded, updateJobCheckpoint } from "../services/jobs.js";
import { mintChapter, mintGenesis } from "../services/mint.js";
import { generateChapterDraft, generateGenesisDraft } from "../services/story.js";
import { getChapterRow, getWorldRow } from "../services/worlds.js";

export async function processJob(job: GenerationJobRow) {
  switch (job.job_type) {
    case "genesis.generate":
      await processGenesisGenerateJob(job);
      return;
    case "portrait.generate":
      await processPortraitJob(job);
      return;
    case "genesis.mint":
      await processGenesisMintJob(job);
      return;
    case "chapter.generate":
      await processChapterGenerateJob(job);
      return;
    case "chapter.image":
      await processChapterImageJob(job);
      return;
    case "chapter.mint":
      await processChapterMintJob(job);
      return;
    default:
      throw new Error(`Unhandled job type: ${job.job_type satisfies never}`);
  }
}

async function processGenesisGenerateJob(job: GenerationJobRow) {
  if (!job.world_id) {
    throw new Error("genesis.generate requires world_id.");
  }

  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(job.world_id);
  const { draft, generation, validationAttempt } = await generateGenesisDraft({
    intake: world.intake,
    styleLock: world.style_lock,
    provider: providerFromJob(job)
  });
  const characterSheet = { ...draft.characterSheet, portraitPrompt: draft.portraitPrompt };
  const styleLock = draft.characterSheet.styleKeywords.join(", ");

  const { error } = await supabase
    .from("worlds")
    .update({
      character_sheet: characterSheet,
      world_facts: draft.worldFacts,
      open_threads: draft.openThreads,
      style_lock: styleLock,
      status: "draft"
    })
    .eq("id", world.id);

  if (error) {
    throw new Error(error.message);
  }

  const portraitJob = await enqueueJobIfMissing({
    jobType: "portrait.generate",
    worldId: world.id,
    payload: { provider: generation.provider }
  });

  await markJobSucceeded(job.id, {
    ai: generationCheckpoint(generation, validationAttempt),
    nextJobId: portraitJob.id
  });
}

async function processPortraitJob(job: GenerationJobRow) {
  if (!job.world_id) {
    throw new Error("portrait.generate requires world_id.");
  }

  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(job.world_id);
  const referenceImageUrl = await generatePortraitUrl(world);

  const { error } = await supabase
    .from("worlds")
    .update({
      reference_image_url: referenceImageUrl,
      status: "portrait_ready"
    })
    .eq("id", world.id);

  if (error) {
    throw new Error(error.message);
  }

  await markJobSucceeded(job.id, { referenceImageUrl });
}

async function processGenesisMintJob(job: GenerationJobRow) {
  if (!job.world_id) {
    throw new Error("genesis.mint requires world_id.");
  }

  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(job.world_id);

  if (world.genesis_token_id) {
    await markJobSucceeded(job.id, { tokenId: world.genesis_token_id, skipped: true });
    return;
  }

  if (!world.reference_image_url) {
    throw new AiBlockedError("Genesis mint is blocked until the safety-approved reference portrait is ready.");
  }

  const metadataUri = await pinJson({
    name: `${world.title ?? "Loreloom World"} Genesis`,
    description: "Loreloom genesis world token.",
    image: world.reference_image_url,
    attributes: {
      styleLock: world.style_lock,
      characterSheet: world.character_sheet
    }
  });
  await updateJobCheckpoint(job.id, { metadataUri });

  const mint = await mintGenesis(world, metadataUri);
  const { error } = await supabase
    .from("worlds")
    .update({
      genesis_token_id: mint.tokenId,
      status: "active"
    })
    .eq("id", world.id);

  if (error) {
    throw new Error(error.message);
  }

  await markJobSucceeded(job.id, {
    metadataUri,
    tokenId: mint.tokenId,
    txHash: mint.txHash
  });
}

async function processChapterGenerateJob(job: GenerationJobRow) {
  if (!job.world_id || !job.chapter_id) {
    throw new Error("chapter.generate requires world_id and chapter_id.");
  }

  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(job.world_id);
  const chapter = await getChapterRow(job.chapter_id);

  if (!chapter.content || !chapter.scene_description) {
    const { draft, generation, validationAttempt } = await generateChapterDraft(world, chapter, providerFromJob(job));
    const { error: chapterError } = await supabase
      .from("chapters")
      .update({
        content: draft.content,
        scene_description: draft.sceneDescription,
        status: "text_ready"
      })
      .eq("id", chapter.id);

    if (chapterError) {
      throw new Error(chapterError.message);
    }

    const { error: worldError } = await supabase
      .from("worlds")
      .update({
        world_facts: draft.worldFacts,
        open_threads: draft.openThreads
      })
      .eq("id", world.id);

    if (worldError) {
      throw new Error(worldError.message);
    }

    await updateJobCheckpoint(job.id, { ai: generationCheckpoint(generation, validationAttempt) });
  }

  const imageJob = await enqueueJobIfMissing({
    jobType: "chapter.image",
    worldId: world.id,
    chapterId: chapter.id
  });

  await markJobSucceeded(job.id, { status: "text_ready", nextJobId: imageJob.id });
}

async function processChapterImageJob(job: GenerationJobRow) {
  if (!job.world_id || !job.chapter_id) {
    throw new Error("chapter.image requires world_id and chapter_id.");
  }

  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(job.world_id);
  const chapter = await getChapterRow(job.chapter_id);

  if (!chapter.image_url) {
    const payload = typeof job.payload === "object" && job.payload !== null && !Array.isArray(job.payload)
      ? job.payload
      : {};

    const aspectRatio = (payload.aspectRatio as "16:9" | "1:1" | "9:16" | undefined) ?? "1:1";
    const styleOverride = payload.styleLock as string | undefined;
    const narrativeOverride = payload.narrativeContext as string | undefined;

    const imageUrl = await generateChapterImageUrl(world, chapter, aspectRatio, {
      styleLock: styleOverride,
      narrativeContext: narrativeOverride
    });
    const { error } = await supabase
      .from("chapters")
      .update({
        image_url: imageUrl,
        status: "image_ready"
      })
      .eq("id", chapter.id);

    if (error) {
      throw new Error(error.message);
    }

    await updateJobCheckpoint(job.id, {
      image: { provider: "gemini", model: "configured", safety: { status: "passed" } }
    });
  }

  const mintJob = await enqueueJobIfMissing({
    jobType: "chapter.mint",
    worldId: world.id,
    chapterId: chapter.id
  });

  await markJobSucceeded(job.id, { nextJobId: mintJob.id });
}

async function processChapterMintJob(job: GenerationJobRow) {
  if (!job.world_id || !job.chapter_id) {
    throw new Error("chapter.mint requires world_id and chapter_id.");
  }

  const supabase = getSupabaseAdmin();
  const world = await getWorldRow(job.world_id);
  const chapter = await getChapterRow(job.chapter_id);

  if (chapter.chapter_token_id) {
    await markJobSucceeded(job.id, { tokenId: chapter.chapter_token_id, skipped: true });
    return;
  }

  if (!chapter.image_url) {
    throw new AiBlockedError("Chapter mint is blocked until the safety-approved illustration is ready.");
  }

  const metadataUri = await pinJson({
    name: `${world.title ?? "Loreloom"} Chapter ${chapter.chapter_index}`,
    description: chapter.content,
    image: chapter.image_url,
    attributes: {
      parentGenesisId: world.genesis_token_id,
      chapterIndex: chapter.chapter_index,
      sceneDescription: chapter.scene_description
    }
  });
  await updateJobCheckpoint(job.id, { metadataUri });

  const mint = await mintChapter(world, chapter, metadataUri);
  const { error } = await supabase
    .from("chapters")
    .update({
      chapter_token_id: mint.tokenId,
      status: "minted"
    })
    .eq("id", chapter.id);

  if (error) {
    throw new Error(error.message);
  }

  await markJobSucceeded(job.id, {
    metadataUri,
    tokenId: mint.tokenId,
    txHash: mint.txHash
  });
}

function providerFromJob(job: GenerationJobRow) {
  if (typeof job.payload === "object" && job.payload !== null && !Array.isArray(job.payload)) {
    const provider = job.payload.provider;
    // Skip openrouter — free tier has a strict daily rate limit causing 429 failures.
    // Map any openrouter jobs to gemini so retrying DB jobs also work.
    if (provider === "gemini" || provider === "nvidia") {
      return provider;
    }
  }

  // Default to Gemini — reliable primary provider with generous quota.
  return "gemini" as const;
}

function generationCheckpoint(
  generation: { provider: string; model: string; safety: { status: string; reason?: string; finishReason?: string } },
  validationAttempt: number
) {
  return {
    provider: generation.provider,
    model: generation.model,
    promptVersion: "v1",
    validationAttempt,
    safety: generation.safety
  };
}
