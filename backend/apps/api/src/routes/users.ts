import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../http/asyncRoute.js";
import { getOrCreateUser } from "../services/users.js";

const createUserSchema = z.object({
  walletAddress: z.string()
});

export const usersRouter = Router();

usersRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
      return;
    }

    const user = await getOrCreateUser(parsed.data.walletAddress);
    res.status(201).json({ user });
  })
);
