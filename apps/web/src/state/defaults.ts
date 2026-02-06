import type { NeckConfig, NeckDiagram, Note, ProjectData } from "@shared/types";

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

const createNotes = (notes: Array<Omit<Note, "id">>): Note[] =>
  notes.map((note) => ({
    id: crypto.randomUUID(),
    ...note
  }));

export const createDemoProject = (): ProjectData => {
  const tabId = crypto.randomUUID();
  const now = new Date().toISOString();

  const diagrams: NeckDiagram[] = [
    createNeckDiagram({
      tabId,
      name: "E Minor Pentatonic",
      x: 120,
      y: 120,
      width: 520,
      height: 160,
      labelMode: "interval",
      config: {
        ...DEFAULT_NECK_CONFIG,
        strings: 6,
        frets: 15,
        tuning: DEFAULT_TUNING_6,
        showFretNumbers: true
      },
      notes: createNotes([
        { stringIndex: 0, fret: 3 },
        { stringIndex: 0, fret: 5 },
        { stringIndex: 1, fret: 3 },
        { stringIndex: 1, fret: 5 },
        { stringIndex: 2, fret: 2 },
        { stringIndex: 2, fret: 5 },
        { stringIndex: 3, fret: 2 },
        { stringIndex: 3, fret: 4 },
        { stringIndex: 4, fret: 3 },
        { stringIndex: 4, fret: 5 },
        { stringIndex: 5, fret: 3 },
        { stringIndex: 5, fret: 5 }
      ])
    }),
    createNeckDiagram({
      tabId,
      name: "Dorian Flow",
      x: 680,
      y: 120,
      width: 520,
      height: 160,
      labelMode: "key",
      config: {
        ...DEFAULT_NECK_CONFIG,
        strings: 7,
        frets: 17,
        tuning: DEFAULT_TUNING_7,
        displayStandardTuning: true,
        showFretNumbers: true,
        fretNumberStyle: "roman"
      },
      notes: createNotes([
        { stringIndex: 0, fret: -1 },
        { stringIndex: 1, fret: -1 },
        { stringIndex: 2, fret: 2 },
        { stringIndex: 2, fret: 4 },
        { stringIndex: 3, fret: 2 },
        { stringIndex: 3, fret: 5 },
        { stringIndex: 4, fret: 2 },
        { stringIndex: 4, fret: 4 },
        { stringIndex: 5, fret: 3 },
        { stringIndex: 5, fret: 5 },
        { stringIndex: 6, fret: 3 },
        { stringIndex: 6, fret: 6 }
      ])
    }),
    createNeckDiagram({
      tabId,
      name: "Picking Drill",
      x: 120,
      y: 360,
      width: 720,
      height: 190,
      labelMode: "picking",
      config: {
        ...DEFAULT_NECK_CONFIG,
        strings: 8,
        frets: 12,
        tuning: DEFAULT_TUNING_8,
        highlightRoot: false
      },
      notes: createNotes([
        { stringIndex: 0, fret: 0, picking: "D" },
        { stringIndex: 0, fret: 2, picking: "U" },
        { stringIndex: 1, fret: 0, picking: "D" },
        { stringIndex: 1, fret: 3, picking: "U" },
        { stringIndex: 2, fret: 2, picking: "D" },
        { stringIndex: 2, fret: 4, picking: "U" },
        { stringIndex: 3, fret: 2, picking: "D" },
        { stringIndex: 3, fret: 5, picking: "U" },
        { stringIndex: 4, fret: 3, picking: "D" },
        { stringIndex: 4, fret: 5, picking: "U" },
        { stringIndex: 5, fret: 3, picking: "D" },
        { stringIndex: 5, fret: 6, picking: "U" }
      ])
    })
  ];

  return {
    diagrams,
    tabs: [{ id: tabId, name: "Demo" }],
    activeTabId: tabId,
    keyId: "default:key:e",
    scaleId: "default:scale:minor-pentatonic",
    positionId: "default:position:position-1",
    createdAt: now,
    updatedAt: now
  };
};
