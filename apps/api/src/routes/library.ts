import { Router } from "express";
import { prisma } from "../db";

const router = Router();

router.get("/", async (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query : "";
  const type = typeof req.query.type === "string" ? req.query.type : undefined;

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
