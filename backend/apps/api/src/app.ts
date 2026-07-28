import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { config } from "./config.js";
import { hasSupabaseAdminConfig } from "./db/supabase.js";
import { HttpError } from "./http/errors.js";
import { aiRouter } from "./routes/ai.js";
import { jobsRouter } from "./routes/jobs.js";
import { usersRouter } from "./routes/users.js";
import { worldsRouter } from "./routes/worlds.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "loreloom-api",
      health: "/health"
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "loreloom-api",
      supabaseConfigured: hasSupabaseAdminConfig()
    });
  });

  app.use("/ai", aiRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/worlds", worldsRouter);

  app.use(errorHandler);

  return app;
}

import { ProviderRequestError } from "./ai/errors.js";

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof ProviderRequestError) {
    const status = error.status ?? 500;
    const isQuota = status === 429 || error.message.toLowerCase().includes("quota") || error.message.toLowerCase().includes("exhausted") || error.message.toLowerCase().includes("rate limit");
    res.status(status).json({
      error: error.message,
      code: isQuota ? "QUOTA_EXCEEDED" : "PROVIDER_ERROR",
      provider: error.message.split(" ")[0]
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "Unexpected server error." });
};
