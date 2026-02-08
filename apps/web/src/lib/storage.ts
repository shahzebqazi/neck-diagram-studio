import type { ProjectData, ProjectRecord } from "@shared/types";
import { normalizeProjectData } from "./projectData";

const LOCAL_KEY = "neck-diagram:last-project";

export const saveLocalProject = (project: ProjectRecord) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(project));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeLocalRecord = (value: unknown): ProjectRecord | null => {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  const title = typeof value.title === "string" ? value.title : null;
  if (!id || !title) return null;
  const data = value.data;
  if (!isRecord(data) || !Array.isArray((data as ProjectData).diagrams)) return null;
  const normalized = normalizeProjectData(data as ProjectData);
  const now = new Date().toISOString();
  const createdAt =
    typeof value.createdAt === "string" && value.createdAt.trim().length > 0
      ? value.createdAt
      : normalized.createdAt ?? now;
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt.trim().length > 0
      ? value.updatedAt
      : now;
  const lastOpenedAt =
    typeof value.lastOpenedAt === "string" && value.lastOpenedAt.trim().length > 0
      ? value.lastOpenedAt
      : now;
  return {
    id,
    title,
    data: normalized,
    createdAt,
    updatedAt,
    lastOpenedAt
  };
};

export const loadLocalProject = (): ProjectRecord | null => {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeLocalRecord(parsed);
  } catch {
    return null;
  }
};
