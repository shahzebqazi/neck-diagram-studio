import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = Router();

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  data: z.unknown().optional()
});

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: z.unknown().optional(),
  lastOpenedAt: z.string().datetime().optional()
});

router.get("/last", async (_req, res) => {
  const project = await prisma.project.findFirst({
    orderBy: { lastOpenedAt: "desc" }
  });

  if (!project) {
    return res.status(204).end();
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { lastOpenedAt: new Date() }
  });

  return res.json(project);
});

router.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  return res.json(project);
});

router.post("/", async (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const project = await prisma.project.create({
    data: {
      title: parsed.data.title,
      data: parsed.data.data ?? {},
      lastOpenedAt: new Date()
    }
  });

  return res.status(201).json(project);
});

router.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const data: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.lastOpenedAt) {
    data.lastOpenedAt = new Date(parsed.data.lastOpenedAt);
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data
  });

  return res.json(project);
});

export default router;
