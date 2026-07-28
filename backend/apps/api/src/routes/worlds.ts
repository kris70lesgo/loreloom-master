import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../http/asyncRoute.js";
import { stringParam } from "../http/params.js";
import {
  confirmWorld,
  createNextChapter,
  createWorld,
  deleteChapter,
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
  aiProvider: z.enum(["gemini", "openrouter", "nvidia"]).optional()
});

export const worldsRouter = Router();

worldsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const creatorId = (req.query.creatorId || req.query.walletAddress || req.query.userId) as string | undefined;
    if (!creatorId) {
      res.json({ worlds: [] });
      return;
    }
    const result = await listUserWorlds(creatorId);
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

    const userIdentifier = parsed.data.creatorId || parsed.data.userId || parsed.data.walletAddress;
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
    const result = await getWorldDetails(stringParam(req.params.worldId, "worldId"));
    res.json(result);
  })
);

worldsRouter.get(
  "/:worldId/canon",
  asyncRoute(async (req, res) => {
    const result = await getCanon(stringParam(req.params.worldId, "worldId"));
    res.json(result);
  })
);

worldsRouter.post(
  "/:worldId/genesis/retry",
  asyncRoute(async (req, res) => {
    const result = await retryGenesisGeneration(stringParam(req.params.worldId, "worldId"));
    res.status(202).json(result);
  })
);

worldsRouter.post(
  "/:worldId/portrait/regenerate",
  asyncRoute(async (req, res) => {
    const result = await regeneratePortrait(stringParam(req.params.worldId, "worldId"));
    res.status(202).json(result);
  })
);

worldsRouter.post(
  "/:worldId/portrait/retry",
  asyncRoute(async (req, res) => {
    const result = await regeneratePortrait(stringParam(req.params.worldId, "worldId"));
    res.status(202).json({ ...result, message: "Let's try that portrait differently before it becomes permanent." });
  })
);

worldsRouter.post(
  "/:worldId/confirm",
  asyncRoute(async (req, res) => {
    const result = await confirmWorld(stringParam(req.params.worldId, "worldId"));
    res.status(202).json(result);
  })
);

worldsRouter.post(
  "/:worldId/chapters",
  asyncRoute(async (req, res) => {
    const result = await createNextChapter(stringParam(req.params.worldId, "worldId"));
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
    const result = await regenerateChapterImage(
      stringParam(req.params.worldId, "worldId"),
      stringParam(req.params.chapterId, "chapterId"),
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
      stringParam(req.params.chapterId, "chapterId")
    );
    res.status(202).json(result);
  })
);

worldsRouter.delete(
  "/:worldId/chapters/:chapterId",
  asyncRoute(async (req, res) => {
    const result = await deleteChapter(
      stringParam(req.params.worldId, "worldId"),
      stringParam(req.params.chapterId, "chapterId")
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
      parsed.sceneDescription
    );
    res.json(result);
  })
);
