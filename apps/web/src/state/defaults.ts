import type { NeckConfig, NeckDiagram, ProjectData } from "@shared/types";

export const DEFAULT_TUNING_6 = ["E", "A", "D", "G", "B", "E"];
export const DEFAULT_TUNING_7 = ["B", "E", "A", "D", "G", "B", "E"];
export const DEFAULT_TUNING_8 = ["F#", "B", "E", "A", "D", "G", "B", "E"];

export const getStandardTuning = (strings: number) => {
  const base =
    strings >= 8
      ? DEFAULT_TUNING_8
      : strings === 7
        ? DEFAULT_TUNING_7
        : DEFAULT_TUNING_6;
  if (strings <= base.length) return base.slice(0, strings);
  const normalized = [...base];
  while (normalized.length < strings) {
    normalized.push(normalized[normalized.length - 1] ?? "E");
  }
  return normalized;
};

export const DEFAULT_NECK_CONFIG: NeckConfig = {
  strings: 8,
  frets: 12,
  scaleLength: 25.5,
  capo: 0,
  tuning: DEFAULT_TUNING_8,
  displayStandardTuning: false,
  fretNumberStyle: "arabic",
  showFretNumbers: false,
  highlightRoot: true,
  snapToGrid: false,
  showInlays: true
};

export const DEFAULT_DIAGRAM_SIZE = {
  width: 520,
  height: 160
};

export const createBlankProject = (): ProjectData => {
  const tabId = crypto.randomUUID();
  return {
    diagrams: [],
    tabs: [{ id: tabId, name: "Tab 1" }],
    activeTabId: tabId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const createNeckDiagram = (partial?: Partial<NeckDiagram>): NeckDiagram => ({
  id: crypto.randomUUID(),
  name: "Neck",
  x: 60,
  y: 80,
  width: DEFAULT_DIAGRAM_SIZE.width,
  height: DEFAULT_DIAGRAM_SIZE.height,
  rotation: 0,
  layoutMode: "grid",
  config: { ...DEFAULT_NECK_CONFIG },
  notes: [],
  labelMode: "key",
  ...partial
});
