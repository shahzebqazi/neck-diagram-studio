import type { NeckConfig, NeckDiagram, ProjectData, ProjectTab } from "@shared/types";
import { createNeckDiagram, DEFAULT_NECK_CONFIG } from "../state/defaults";

export const createDefaultTab = (name = "Tab 1"): ProjectTab => ({
  id: crypto.randomUUID(),
  name
});

export const stripScaleLength = (config: NeckConfig) => {
  const { scaleLength: _removed, ...rest } = config as Record<string, unknown>;
  return rest as NeckConfig;
};

export const normalizeProjectData = (data: ProjectData): ProjectData => {
  const now = new Date().toISOString();
  const incomingTabs = Array.isArray(data.tabs) ? data.tabs.filter((tab) => tab?.id) : [];
  const tabs = incomingTabs.length > 0 ? incomingTabs : [createDefaultTab()];
  const activeTabId =
    data.activeTabId && tabs.some((tab) => tab.id === data.activeTabId)
      ? data.activeTabId
      : tabs[0].id;
  const diagrams = Array.isArray(data.diagrams)
    ? data.diagrams.map((diagram) => {
        const rawConfig =
          diagram.config && typeof diagram.config === "object"
            ? (diagram.config as NeckConfig)
            : DEFAULT_NECK_CONFIG;
        return {
          ...diagram,
          config: stripScaleLength(rawConfig),
          tabId: tabs.some((tab) => tab.id === diagram.tabId) ? diagram.tabId : activeTabId,
          layoutMode: diagram.layoutMode ?? "grid"
        };
      })
    : [];
  const selectedDiagramId =
    data.selectedDiagramId &&
    diagrams.some((diagram) => diagram.id === data.selectedDiagramId)
      ? data.selectedDiagramId
      : undefined;
  return {
    ...data,
    diagrams,
    tabs,
    activeTabId,
    selectedDiagramId,
    createdAt: data.createdAt ?? now,
    updatedAt: now
  };
};

export const parseProjectPayload = (parsed: unknown) => {
  const fallback = { title: null as string | null, data: null as ProjectData | null };
  if (!parsed || typeof parsed !== "object") return fallback;
  const record = parsed as { title?: unknown; data?: unknown };
  const title = typeof record.title === "string" ? record.title.trim() : null;
  if (
    record.data &&
    typeof record.data === "object" &&
    Array.isArray((record.data as ProjectData).diagrams)
  ) {
    return { title, data: normalizeProjectData(record.data as ProjectData) };
  }
  if (Array.isArray((parsed as ProjectData).diagrams)) {
    return { title, data: normalizeProjectData(parsed as ProjectData) };
  }
  return fallback;
};

export const safeJsonParse = (text: string) => {
  try {
    return { ok: true as const, value: JSON.parse(text) };
  } catch {
    return { ok: false as const, value: null };
  }
};

export const buildDiagramExportPayload = (diagram: NeckDiagram, exportedAt: string) => ({
  diagram,
  exportedAt,
  version: 1
});

type PageExportInput = {
  title: string;
  tabName: string;
  diagrams: NeckDiagram[];
  createdAt: string;
  exportedAt: string;
  exportedOn: string;
  keyId?: string;
  scaleId?: string;
  positionId?: string;
  searchQuery?: string;
};

export const buildPageExportPayload = ({
  title,
  tabName,
  diagrams,
  createdAt,
  exportedAt,
  exportedOn,
  keyId,
  scaleId,
  positionId,
  searchQuery
}: PageExportInput) => {
  const tabId = crypto.randomUUID();
  const data: ProjectData = {
    diagrams: diagrams.map((diagram) => ({ ...diagram, tabId })),
    tabs: [{ id: tabId, name: tabName }],
    activeTabId: tabId,
    selectedDiagramId: diagrams[0]?.id,
    keyId,
    scaleId,
    positionId,
    searchQuery,
    createdAt,
    updatedAt: exportedAt
  };
  return {
    title,
    data,
    metadata: {
      exportedAt,
      exportedOn
    },
    version: 1
  };
};

export const normalizeImportedDiagram = (
  diagram: NeckDiagram,
  tabId: string,
  existingIds: Set<string>
) => {
  const nextId = diagram.id && !existingIds.has(diagram.id) ? diagram.id : crypto.randomUUID();
  existingIds.add(nextId);
  const rawConfig =
    diagram.config && typeof diagram.config === "object" ? (diagram.config as NeckConfig) : {};
  const config = stripScaleLength({ ...DEFAULT_NECK_CONFIG, ...rawConfig });
  return createNeckDiagram({
    ...diagram,
    id: nextId,
    tabId,
    layoutMode: diagram.layoutMode ?? "grid",
    config,
    notes: Array.isArray(diagram.notes) ? diagram.notes : [],
    labelMode: diagram.labelMode ?? "key"
  });
};
