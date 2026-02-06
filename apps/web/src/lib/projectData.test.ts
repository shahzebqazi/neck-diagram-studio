import { describe, expect, it } from "vitest";
import type { ProjectData } from "@shared/types";
import { DEFAULT_NECK_CONFIG, createNeckDiagram } from "../state/defaults";
import {
  buildDiagramExportPayload,
  buildPageExportPayload,
  normalizeImportedDiagram,
  normalizeProjectData,
  parseProjectPayload,
  safeJsonParse
} from "./projectData";

describe("project data normalization", () => {
  it("creates a fallback tab and activeTabId when missing", () => {
    const raw = {
      diagrams: [],
      createdAt: "",
      updatedAt: ""
    } as ProjectData;
    const normalized = normalizeProjectData(raw);
    expect(normalized.tabs?.length).toBe(1);
    expect(normalized.activeTabId).toBe(normalized.tabs?.[0].id);
    expect(normalized.createdAt).not.toBe("");
    expect(normalized.updatedAt).not.toBe("");
  });

  it("clears selectedDiagramId when it is invalid", () => {
    const raw = {
      diagrams: [],
      selectedDiagramId: "missing",
      createdAt: "",
      updatedAt: ""
    } as ProjectData;
    const normalized = normalizeProjectData(raw);
    expect(normalized.selectedDiagramId).toBeUndefined();
  });

  it("removes scaleLength from diagram config", () => {
    const diagram = createNeckDiagram({
      id: "diagram-1",
      config: { ...(DEFAULT_NECK_CONFIG as Record<string, unknown>), scaleLength: 25.5 } as any
    });
    const raw = {
      diagrams: [diagram],
      createdAt: "",
      updatedAt: ""
    } as ProjectData;
    const normalized = normalizeProjectData(raw);
    expect("scaleLength" in (normalized.diagrams[0]?.config ?? {})).toBe(false);
  });
});

describe("project payload parsing", () => {
  it("flags invalid JSON strings", () => {
    const parsed = safeJsonParse("{oops");
    expect(parsed.ok).toBe(false);
  });

  it("accepts valid JSON strings", () => {
    const parsed = safeJsonParse("{\"diagrams\":[]}");
    expect(parsed.ok).toBe(true);
  });

  it("accepts wrapped project payloads", () => {
    const payload = {
      title: "My Project",
      data: { diagrams: [], createdAt: "", updatedAt: "" }
    };
    const parsed = parseProjectPayload(payload);
    expect(parsed.title).toBe("My Project");
    expect(parsed.data).not.toBeNull();
  });

  it("accepts bare project payloads", () => {
    const payload = { diagrams: [], createdAt: "", updatedAt: "" };
    const parsed = parseProjectPayload(payload);
    expect(parsed.data).not.toBeNull();
  });

  it("rejects invalid payloads", () => {
    const parsed = parseProjectPayload({ foo: "bar" });
    expect(parsed.data).toBeNull();
  });
});

describe("imported diagram normalization", () => {
  it("dedupes ids and fills defaults", () => {
    const diagram = createNeckDiagram({
      id: "dupe-id",
      layoutMode: undefined,
      notes: undefined as any,
      config: { ...(DEFAULT_NECK_CONFIG as Record<string, unknown>), scaleLength: 26 } as any
    });
    const existingIds = new Set(["dupe-id"]);
    const normalized = normalizeImportedDiagram(diagram as any, "tab-1", existingIds);
    expect(normalized.id).not.toBe("dupe-id");
    expect(normalized.layoutMode).toBe("grid");
    expect(Array.isArray(normalized.notes)).toBe(true);
    expect("scaleLength" in (normalized.config ?? {})).toBe(false);
    expect(existingIds.has(normalized.id)).toBe(true);
  });
});

describe("export payload builders", () => {
  it("builds diagram export payloads", () => {
    const diagram = createNeckDiagram({ id: "diagram-1" });
    const payload = buildDiagramExportPayload(diagram, "2026-02-06T00:00:00.000Z");
    expect(payload.version).toBe(1);
    expect(payload.exportedAt).toBe("2026-02-06T00:00:00.000Z");
    expect(payload.diagram.id).toBe("diagram-1");
  });

  it("builds page export payloads", () => {
    const diagrams = [createNeckDiagram({ id: "d1" }), createNeckDiagram({ id: "d2" })];
    const payload = buildPageExportPayload({
      title: "Page Export",
      tabName: "Tab A",
      diagrams,
      createdAt: "2026-01-01T00:00:00.000Z",
      exportedAt: "2026-02-06T00:00:00.000Z",
      exportedOn: "Friday, Feb 6, 2026",
      keyId: "default:key:e",
      scaleId: "default:scale:minor-pentatonic",
      positionId: "default:position:position-1",
      searchQuery: "dorian"
    });
    expect(payload.version).toBe(1);
    expect(payload.title).toBe("Page Export");
    expect(payload.metadata.exportedOn).toBe("Friday, Feb 6, 2026");
    expect(payload.data.tabs?.[0]?.name).toBe("Tab A");
    expect(payload.data.selectedDiagramId).toBe("d1");
    expect(payload.data.updatedAt).toBe("2026-02-06T00:00:00.000Z");
    expect(payload.data.keyId).toBe("default:key:e");
    expect(payload.data.scaleId).toBe("default:scale:minor-pentatonic");
    expect(payload.data.positionId).toBe("default:position:position-1");
    expect(payload.data.searchQuery).toBe("dorian");
    const tabId = payload.data.tabs?.[0]?.id;
    expect(payload.data.diagrams.every((diagram) => diagram.tabId === tabId)).toBe(true);
  });
});
