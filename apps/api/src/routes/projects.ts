import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = Router();

const labelModeSchema = z.enum(["key", "interval", "picking"]);
const noteSchema = z.object({
  id: z.string().min(1),
  stringIndex: z.number().int().min(0),
  fret: z.number().int(),
  label: z.string().optional(),
  labelMode: labelModeSchema.optional(),
  picking: z.enum(["D", "U"]).optional()
});
const neckConfigSchema = z.object({
  strings: z.number().int().min(1).max(12),
  frets: z.number().int().min(1).max(36),
  capo: z.number().int().min(0).max(36),
  tuning: z.array(z.string()).min(1),
  displayStandardTuning: z.boolean().optional(),
  fretNumberStyle: z.enum(["arabic", "roman"]).optional(),
  showFretNumbers: z.boolean().optional(),
  highlightRoot: z.boolean().optional(),
  snapToGrid: z.boolean().optional(),
  showInlays: z.boolean().optional()
});
const diagramSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  layoutMode: z.enum(["grid", "float"]).optional(),
  tabId: z.string().optional(),
  keyId: z.string().optional(),
  scaleId: z.string().optional(),
  positionId: z.string().optional(),
  config: neckConfigSchema,
  notes: z.array(noteSchema),
  labelMode: labelModeSchema
});
const tabSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200)
});
const projectDataSchema = z.object({
  diagrams: z.array(diagramSchema),
  selectedDiagramId: z.string().optional(),
  tabs: z.array(tabSchema).optional(),
  activeTabId: z.string().optional(),
  scaleId: z.string().optional(),
  keyId: z.string().optional(),
  positionId: z.string().optional(),
  searchQuery: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  data: projectDataSchema
});

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: projectDataSchema.optional(),
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

  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "No updates provided" });
  }

  const existing = await prisma.project.findUnique({
    where: { id: req.params.id }
  });
  if (!existing) {
    return res.status(404).json({ error: "Project not found" });
  }

  const data: Record<string, unknown> = { ...patch };

  if (patch.lastOpenedAt) {
    data.lastOpenedAt = new Date(patch.lastOpenedAt);
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data
  });

  return res.json(project);
});

export default router;
