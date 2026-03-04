import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIf = hasDatabase ? describe.sequential : describe.skip;

describeIf("library API", () => {
  const app = createApp();
  const createdLibraryIds: string[] = [];

  afterAll(async () => {
    if (createdLibraryIds.length > 0) {
      await prisma.libraryItem.deleteMany({ where: { id: { in: createdLibraryIds } } });
    }
    await prisma.$disconnect();
  });

  it("rejects invalid library types", async () => {
    const res = await request(app).get("/api/library?type=invalid");
    expect(res.status).toBe(400);
  });

  it("returns library items filtered by type and query", async () => {
    const stableId = `test:scale:test-scale-${Date.now()}`;
    const item = await prisma.libraryItem.create({
      data: {
        stableId,
        type: "scale",
        name: `Test Scale ${Date.now()}`,
        intervals: [0, 2, 4, 7, 9],
        description: "Test scale description"
      }
    });
    createdLibraryIds.push(item.id);

    const res = await request(app)
      .get("/api/library")
      .query({ query: item.name.split(" ")[0], type: "scale" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((result: { id?: string }) => result.id === item.id)).toBe(true);
    expect(res.body.some((result: { stableId?: string }) => result.stableId === stableId)).toBe(
      true
    );
  });
});
