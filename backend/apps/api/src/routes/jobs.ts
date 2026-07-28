import { Router } from "express";
import { asyncRoute } from "../http/asyncRoute.js";
import { stringParam } from "../http/params.js";
import { getJob } from "../services/jobs.js";

export const jobsRouter = Router();

jobsRouter.get(
  "/:jobId",
  asyncRoute(async (req, res) => {
    const job = await getJob(stringParam(req.params.jobId, "jobId"));
    res.json({ job });
  })
);
