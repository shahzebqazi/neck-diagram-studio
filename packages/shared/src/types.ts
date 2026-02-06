export type LabelMode = "key" | "interval" | "picking";

export type Note = {
  id: string;
  stringIndex: number;
  fret: number;
  label?: string;
  labelMode?: LabelMode;
  picking?: "D" | "U";
};

export type NeckConfig = {
  strings: number;
  frets: number;
  capo: number;
  tuning: string[];
  displayStandardTuning?: boolean;
  fretNumberStyle?: "arabic" | "roman";
  showFretNumbers?: boolean;
  highlightRoot?: boolean;
  snapToGrid?: boolean;
  showInlays?: boolean;
};

export type NeckDiagram = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layoutMode?: "grid" | "float";
  tabId?: string;
  keyId?: string;
  scaleId?: string;
  positionId?: string;
  config: NeckConfig;
  notes: Note[];
  labelMode: LabelMode;
};

export type ProjectTab = {
  id: string;
  name: string;
};

export type ProjectData = {
  diagrams: NeckDiagram[];
  selectedDiagramId?: string;
  tabs?: ProjectTab[];
  activeTabId?: string;
  scaleId?: string;
  keyId?: string;
  positionId?: string;
  searchQuery?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  data: ProjectData;
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LibraryItem = {
  id: string;
  type: "scale" | "mode" | "shape" | "position" | "key";
  name: string;
  intervals?: number[] | null;
  description?: string | null;
};
