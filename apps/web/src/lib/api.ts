import type { LibraryItem, ProjectData, ProjectRecord } from "@shared/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export const fetchLastProject = async () => {
  const res = await fetch(`${API_BASE}/api/projects/last`, {
    credentials: "include"
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error("Failed to load project");
  return (await res.json()) as ProjectRecord;
};

export const createProject = async (title: string, data: ProjectData) => {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title, data })
  });
  if (!res.ok) throw new Error("Failed to create project");
  return (await res.json()) as ProjectRecord;
};

export const updateProject = async (id: string, payload: Partial<ProjectRecord>) => {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update project");
  return (await res.json()) as ProjectRecord;
};

export const fetchLibrary = async (query?: string, type?: string) => {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (type) params.set("type", type);
  const res = await fetch(`${API_BASE}/api/library?${params.toString()}`, {
    credentials: "include"
  });
  if (!res.ok) throw new Error("Failed to load library");
  return (await res.json()) as LibraryItem[];
};

export const login = async (email: string, password: string, remember: boolean) => {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, remember })
  });
  if (!res.ok) throw new Error("Failed to log in");
  return res.json().catch(() => ({}));
};
