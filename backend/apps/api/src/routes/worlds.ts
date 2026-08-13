import { Router, type Request } from "express";
import { z } from "zod";
import { generateProductionPlans } from "../services/director.js";
import { getSupabaseAdmin } from "../db/supabase.js";
import { HttpError } from "../http/errors.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { stringParam } from "../http/params.js";
import {
  confirmWorld,
  createNextChapter,
  createWorld,
  deleteChapter,
  deleteWorld,
  getCanon,
  getWorldDetails,
  intakeSchema,
  listUserWorlds,
  regeneratePortrait,
  regenerateChapterImage,
  retryGenesisGeneration,
  retryChapterGeneration,
  updateChapterContent
} from "../services/worlds.js";

const createWorldSchema = z.object({
  walletAddress: z.string().optional(),
  creatorId: z.string().optional(),
  userId: z.string().optional(),
  title: z.string().trim().min(1).optional(),
  intake: intakeSchema.optional(),
  styleLock: z.string().trim().min(1).optional(),
  aiProvider: z.enum(["openrouter", "nvidia", "groq"]).optional()
});

export const worldsRouter = Router();

async function getRequestOwnerId(req: Request) {
  const authorization = req.header("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (token) {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user) {
      throw new HttpError(401, "Invalid Supabase session.");
    }
    return data.user.id;
  }

  const headerOwner = req.header("x-loreloom-owner-id");
  const fallbackOwner =
    headerOwner ||
    (typeof req.query.creatorId === "string" ? req.query.creatorId : undefined) ||
    (typeof req.query.userId === "string" ? req.query.userId : undefined) ||
    (typeof req.query.walletAddress === "string" ? req.query.walletAddress : undefined) ||
    req.body?.creatorId ||
    req.body?.userId ||
    req.body?.walletAddress;

  if (!fallbackOwner || typeof fallbackOwner !== "string") {
    throw new HttpError(401, "User identity is required.");
  }

  return fallbackOwner;
}

worldsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await listUserWorlds(ownerId);
    res.json(result);
  })
);

worldsRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = createWorldSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
      return;
    }

    const requestOwnerId = await getRequestOwnerId(req);
    const userIdentifier = requestOwnerId || parsed.data.creatorId || parsed.data.userId || parsed.data.walletAddress;
    if (!userIdentifier) {
      res.status(400).json({ error: "creatorId or walletAddress is required." });
      return;
    }

    const result = await createWorld({ ...parsed.data, walletAddress: userIdentifier });
    res.status(201).json(result);
  })
);

worldsRouter.get(
  "/:worldId",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await getWorldDetails(stringParam(req.params.worldId, "worldId"), ownerId);
    res.json(result);
  })
);

worldsRouter.get(
  "/:worldId/canon",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await getCanon(stringParam(req.params.worldId, "worldId"), ownerId);
    res.json(result);
  })
);

worldsRouter.delete(
  "/:worldId",
  asyncRoute(async (req, res) => {
    const result = await deleteWorld(
      stringParam(req.params.worldId, "worldId"),
      await getRequestOwnerId(req)
    );
    res.json(result);
  })
);

worldsRouter.post(
  "/:worldId/genesis/retry",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await retryGenesisGeneration(stringParam(req.params.worldId, "worldId"), ownerId);
    res.status(202).json(result);
  })
);

worldsRouter.post(
  "/:worldId/portrait/regenerate",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await regeneratePortrait(stringParam(req.params.worldId, "worldId"), ownerId);
    res.status(202).json(result);
  })
);

worldsRouter.post(
  "/:worldId/portrait/retry",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await regeneratePortrait(stringParam(req.params.worldId, "worldId"), ownerId);
    res.status(202).json({ ...result, message: "Let's try that portrait differently before it becomes permanent." });
  })
);

worldsRouter.post(
  "/:worldId/confirm",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await confirmWorld(stringParam(req.params.worldId, "worldId"), ownerId);
    res.status(202).json(result);
  })
);

worldsRouter.post(
  "/:worldId/chapters",
  asyncRoute(async (req, res) => {
    const ownerId = await getRequestOwnerId(req);
    const result = await createNextChapter(stringParam(req.params.worldId, "worldId"), ownerId);
    res.status(202).json(result);
  })
);

const regenerateImageSchema = z.object({
  narrativeContext: z.string().optional(),
  styleLock: z.string().optional(),
  aspectRatio: z.enum(["16:9", "1:1", "9:16"]).optional()
});

worldsRouter.post(
  "/:worldId/chapters/:chapterId/regenerate-image",
  asyncRoute(async (req, res) => {
    const parsed = regenerateImageSchema.safeParse(req.body);
    const options = parsed.success ? parsed.data : {};
    const ownerId = await getRequestOwnerId(req);
    const result = await regenerateChapterImage(
      stringParam(req.params.worldId, "worldId"),
      stringParam(req.params.chapterId, "chapterId"),
      ownerId,
      options
    );
    res.status(202).json(result);
  })
);

worldsRouter.post(
  "/:worldId/chapters/:chapterId/retry",
  asyncRoute(async (req, res) => {
    const result = await retryChapterGeneration(
      stringParam(req.params.worldId, "worldId"),
      stringParam(req.params.chapterId, "chapterId"),
      await getRequestOwnerId(req)
    );
    res.status(202).json(result);
  })
);

worldsRouter.delete(
  "/:worldId/chapters/:chapterId",
  asyncRoute(async (req, res) => {
    const result = await deleteChapter(
      stringParam(req.params.worldId, "worldId"),
      stringParam(req.params.chapterId, "chapterId"),
      await getRequestOwnerId(req)
    );
    res.json(result);
  })
);

const updateChapterSchema = z.object({
  content: z.string(),
  sceneDescription: z.string().optional()
});

worldsRouter.patch(
  "/:worldId/chapters/:chapterId",
  asyncRoute(async (req, res) => {
    const parsed = updateChapterSchema.parse(req.body);
    const result = await updateChapterContent(
      stringParam(req.params.worldId, "worldId"),
      stringParam(req.params.chapterId, "chapterId"),
      parsed.content,
      await getRequestOwnerId(req),
      parsed.sceneDescription
    );
    res.json(result);
  })
);

const generatePlansSchema = z.object({
  budgetHbar: z.number().min(1)
});

worldsRouter.post(
  "/:worldId/plans",
  asyncRoute(async (req, res) => {
    const parsed = generatePlansSchema.parse(req.body);
    await generateProductionPlans(stringParam(req.params.worldId, "worldId"), parsed.budgetHbar);
    
    const supabase = getSupabaseAdmin();
    const { data: plans } = await supabase.from("production_plans").select("id, world_id, plan_type, estimated_cost_hbar, estimated_duration_ms, estimated_quality_score, provider_allocations, created_at").eq("world_id", req.params.worldId);
    res.json({ plans });
  })
);

worldsRouter.get(
  "/:worldId/plans",
  asyncRoute(async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { data: plans } = await supabase.from("production_plans").select("id, world_id, plan_type, estimated_cost_hbar, estimated_duration_ms, estimated_quality_score, provider_allocations, created_at").eq("world_id", req.params.worldId);
    res.json({ plans });
  })
);

worldsRouter.get(
  "/:worldId/procurements",
  asyncRoute(async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { data: procurements } = await supabase.from("procurements").select("id, world_id, chapter_id, provider_id, task_type, status, cost_hbar, payment_receipt, hashscan_url, asset_url, created_at, updated_at, provider_registry(name, category)").eq("world_id", req.params.worldId);
    res.json({ procurements });
  })
);
