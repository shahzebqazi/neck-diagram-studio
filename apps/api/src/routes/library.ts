import { Router } from "express";
import { prisma } from "../db";

const router = Router();
const ALLOWED_TYPES = new Set(["scale", "mode", "shape", "position", "key"]);

router.get("/", async (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query : "";
  const rawType = typeof req.query.type === "string" ? req.query.type : undefined;
  const type = rawType && ALLOWED_TYPES.has(rawType) ? rawType : undefined;
  if (rawType && !type) {
    return res.status(400).json({ error: "Invalid library type" });
  }

  const items = await prisma.libraryItem.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(query
        ? {
            name: {
              contains: query,
              mode: "insensitive"
            }
          }
        : {})
    },
    orderBy: {
      name: "asc"
    }
  });

  return res.json(items);
});

export default router;
