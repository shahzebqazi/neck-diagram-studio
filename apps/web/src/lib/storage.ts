import type { ProjectRecord } from "@shared/types";

const LOCAL_KEY = "neck-diagram:last-project";

export const saveLocalProject = (project: ProjectRecord) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(project));
};

export const loadLocalProject = (): ProjectRecord | null => {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProjectRecord;
  } catch {
    return null;
  }
};
