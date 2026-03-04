import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIf = hasDatabase ? describe.sequential : describe.skip;

describeIf("projects API", () => {
  const app = createApp();
  const createdProjectIds: string[] = [];
  let projectId: string | null = null;

  const buildProjectPayload = (title: string) => {
    const timestamp = new Date().toISOString();
    return {
      title,
      data: {
        diagrams: [],
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };
  };

  afterAll(async () => {
    if (createdProjectIds.length > 0) {
      await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    }
    await prisma.$disconnect();
  });

  it("creates a project", async () => {
    const payload = buildProjectPayload(`Test Project ${Date.now()}`);
    const res = await request(app).post("/api/projects").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    projectId = res.body.id;
    createdProjectIds.push(res.body.id);
  });

  it("fetches a project by id", async () => {
    expect(projectId).toBeTruthy();
    const res = await request(app).get(`/api/projects/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
  });

  it("rejects invalid payloads", async () => {
    const res = await request(app).post("/api/projects").send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for missing project ids", async () => {
    const res = await request(app).get("/api/projects/missing-id");
    expect(res.status).toBe(404);
  });

  it("rejects empty patch bodies", async () => {
    expect(projectId).toBeTruthy();
    const res = await request(app).patch(`/api/projects/${projectId}`).send({});
    expect(res.status).toBe(400);
  });

  it("updates a project title", async () => {
    expect(projectId).toBeTruthy();
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ title: "Updated Title" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
  });

  it("returns the most recently opened project", async () => {
    const timestamp = new Date().toISOString();
    const project = await prisma.project.create({
      data: {
        title: `Latest Project ${Date.now()}`,
        data: {
          diagrams: [],
          createdAt: timestamp,
          updatedAt: timestamp
        },
        lastOpenedAt: new Date("2100-01-01T00:00:00.000Z")
      }
    });
    createdProjectIds.push(project.id);
    const res = await request(app).get("/api/projects/last");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(project.id);
  });

  it("returns 404 when PATCH targets missing project id", async () => {
    const res = await request(app)
      .patch("/api/projects/00000000-0000-0000-0000-000000000000")
      .send({ title: "No Such Project" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("POST /api/projects/last/touch returns 204", async () => {
    const res = await request(app).post("/api/projects/last/touch");
    expect(res.status).toBe(204);
  });
});
