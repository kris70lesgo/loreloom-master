import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../http/asyncRoute.js";
import { researchHeritageSubject } from "../services/heritageResearch.js";

const researchSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters."),
  category: z.string().trim().optional(),
  forceFresh: z.boolean().optional()
});

export const heritageRouter = Router();

/**
 * POST /api/heritage/research
 * Triggers heritage research for a subject and returns structured evidence with sources.
 * This is an internal research endpoint — not a search UI.
 */
heritageRouter.post(
  "/research",
  asyncRoute(async (req, res) => {
    const parsed = researchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
      return;
    }

    const evidence = await researchHeritageSubject({
      subject: parsed.data.subject,
      category: parsed.data.category,
      forceFresh: parsed.data.forceFresh ?? false
    });

    if (!evidence) {
      res.json({
        subject: parsed.data.subject,
        claims: [],
        sources: [],
        message: "No research evidence available. Tavily may not be configured or no results were found."
      });
      return;
    }

    res.json(evidence);
  })
);

/**
 * GET /api/heritage/sources?subject=...
 * Returns just the sources for a heritage subject (for frontend source display).
 */
heritageRouter.get(
  "/sources",
  asyncRoute(async (req, res) => {
    const subject = (req.query.subject as string | undefined)?.trim();
    if (!subject || subject.length < 3) {
      res.status(400).json({ error: "subject query parameter is required (min 3 characters)." });
      return;
    }

    const evidence = await researchHeritageSubject({
      subject,
      forceFresh: false
    });

    res.json({
      subject,
      sources: evidence?.sources ?? [],
      claims: evidence?.claims ?? []
    });
  })
);
