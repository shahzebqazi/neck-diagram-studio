import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { jsPDF } from "jspdf";
import type {
  LibraryItem,
  LabelMode,
  NeckDiagram,
  Note,
  ProjectData,
  ProjectRecord,
  ProjectTab,
  Worksheet,
  WorksheetItem
} from "@shared/types";
import NeckDiagramView from "./components/NeckDiagram";
import {
  createBlankProject,
  createDemoProject,
  createNeckDiagram,
  DEFAULT_NECK_CONFIG,
  DEFAULT_DIAGRAM_SIZE,
  DEFAULT_TUNING_8,
  getStandardTuning
} from "./state/defaults";
import { suggestTile } from "./lib/tiling";
import { fetchLastProject, createProject, updateProject, fetchLibrary } from "./lib/api";
import { loadLocalProject, saveLocalProject } from "./lib/storage";
import { useDebouncedEffect } from "./lib/hooks";
import { requestExportName, slugify } from "./lib/exportUtils";
import { DEFAULT_KEYS, DEFAULT_MODES, DEFAULT_POSITIONS, DEFAULT_SCALES } from "./lib/libraryDefaults";
import {
  createDefaultTab,
  buildDiagramExportPayload,
  buildPageExportPayload,
  normalizeImportedDiagram,
  parseProjectPayload,
  safeJsonParse,
  stripScaleLength
} from "./lib/projectData";
import { getNoteIndex, noteNameToIndex } from "./lib/neckMath";

const MIN_WIDTH = 260;
const MIN_HEIGHT = 90;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 400;
const EXPORT_SCALE = 2;
/** 300 DPI for print-ready PDFs (screen is 96 DPI). */
const PDF_DPI = 300;
const SCREEN_DPI = 96;
const EXPORT_CAPTION_HEIGHT = 28;
const FRET_NUMBER_MARGIN = 6;
const MIN_NOTE_RADIUS = 8;
const DEFAULT_PROJECT_TITLE = "Untitled Neck Diagram";
const DEMO_PROJECT_TITLE = "Demo Session";
const GRID_SIZE = 32;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const DRAG_THRESHOLD = 4;
const US_LETTER_SIZE = { width: 816, height: 1056 };
const OUTLINE_PADDING = 32;
/** Padding on canvas-surface (styles.css); used so outline is centered in the visible content area at any zoom/resolution. */
const CANVAS_SURFACE_PADDING = 24;
const TILE_GAP = 24;
const MIN_SIDEBAR_WIDTH = 120;
const MAX_SIDEBAR_WIDTH = 480;
const SIDEBAR_STATE_STORAGE_KEY = "neck-diagram:sidebar-collapsed";
const PAGE_DATE_STORAGE_KEY = "neck-diagram:page-date";
const DELETE_WARNING_STORAGE_KEY = "neck-diagram:delete-warning";
const THEME_STORAGE_KEY = "neck-diagram:theme";
const WORKSHEETS_STORAGE_KEY = "neck-diagram:worksheets";
const THEMES = [
  {
    id: "jaffa-cake",
    label: "Jaffa Cake",
    preview: "linear-gradient(135deg, #0b0f14 0%, #111821 50%, #ff7a18 100%)"
  },
  {
    id: "light",
    label: "Light",
    preview: "linear-gradient(135deg, #f8f5f1 0%, #ffffff 55%, #f28c28 100%)"
  },
  {
    id: "catputtchin",
    label: "Catputtchin",
    preview: "linear-gradient(135deg, #1b1410 0%, #2a1f1a 55%, #e7b77d 100%)"
  },
  {
    id: "high-contrast",
    label: "High Contrast",
    preview: "linear-gradient(135deg, #000000 0%, #ffffff 55%, #ffd400 100%)"
  },
  {
    id: "fifties",
    label: "50's",
    preview: "linear-gradient(135deg, #e0f2ea 0%, #cfe8f6 45%, #f6d66a 100%)"
  },
  {
    id: "oled-blackout",
    label: "OLED Blackout",
    preview: "linear-gradient(135deg, #000000 0%, #111111 50%, #ff3b3b 100%)"
  }
] as const;
type ThemeId = (typeof THEMES)[number]["id"];
const DEFAULT_THEME: ThemeId = "high-contrast";
const isThemeId = (value: string): value is ThemeId =>
  THEMES.some((theme) => theme.id === value);
const POSITION_PRESETS: Record<
  string,
  { minFret: number; maxFret: number; minFrets?: number }
> = {
  "position 1": { minFret: 0, maxFret: 4, minFrets: 24 },
  "position 2": { minFret: 5, maxFret: 9, minFrets: 24 },
  "position 3": { minFret: 10, maxFret: 14, minFrets: 24 },
  "position 4": { minFret: 15, maxFret: 19, minFrets: 24 },
  "position 5": { minFret: 20, maxFret: 23, minFrets: 24 },
  "1-12": { minFret: 0, maxFret: 11, minFrets: 12 },
  "12-24": { minFret: 12, maxFret: 23, minFrets: 24 },
  "whole neck": { minFret: 0, maxFret: 23, minFrets: 24 }
};
const ICONS = {
  add: "\uf067",
  export: "\uf019",
  png: "\uf1c5",
  pdf: "\uf1c1",
  json: "\uf1c9",
  upload: "\uf093",
  trash: "\uf1f8",
  chevron: "\uf078",
  worksheets: "\uf718",
  theory: "\uf02d",
  diagram: "\uf0e8",
  instrument: "\uf001",
  settings: "\uf013"
};

const formatExportDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

type DragMode = "move" | "resize" | "scale";
type DeleteAction = { type: "diagram" | "tab"; id: string };

type DragState = {
  id: string;
  mode: DragMode;
  startX: number;
  startY: number;
  origin: { x: number; y: number; width: number; height: number };
  hasMoved: boolean;
};

type OutlineMetrics = {
  width: number;
  height: number;
  left: number;
  top: number;
};

const normalizeNoteName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const letter = trimmed[0]?.toUpperCase();
  if (!letter || !["A", "B", "C", "D", "E", "F", "G"].includes(letter)) {
    return trimmed.toUpperCase();
  }
  const accidental = trimmed[1];
  if (accidental === "#") return `${letter}#`;
  if (accidental === "b" || accidental === "B") return `${letter}b`;
  return letter;
};

const normalizeTuning = (strings: number, tuning: string[]) => {
  let normalized =
    tuning.length > 0 ? tuning.map(normalizeNoteName).filter((note) => note.length > 0) : [];
  if (normalized.length === 0) {
    normalized = getStandardTuning(strings);
  }
  if (normalized.length > strings) return normalized.slice(0, strings);
  while (normalized.length < strings) {
    normalized.push(normalized[normalized.length - 1] ?? "E");
  }
  return normalized;
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const boxesOverlap = (a: NeckDiagram, b: NeckDiagram, gap = TILE_GAP) =>
  !(
    a.x + a.width + gap <= b.x ||
    a.x >= b.x + b.width + gap ||
    a.y + getDiagramExportHeight(a) + gap <= b.y ||
    a.y >= b.y + getDiagramExportHeight(b) + gap
  );

const EIGHT_STRING_PRESETS = [
  { label: "F# Standard", tuning: DEFAULT_TUNING_8 },
  { label: "Half Step Down", tuning: ["F", "A#", "D#", "G#", "C#", "F#", "A#", "D#"] },
  { label: "Drop E", tuning: ["E", "B", "E", "A", "D", "G", "B", "E"] },
  { label: "E Standard", tuning: ["E", "A", "D", "G", "C", "F", "A", "D"] }
] as const;

const SVG_EXPORT_VARS: Array<{ name: string; fallback: string }> = [
  { name: "--diagram-bg", fallback: "#000000" },
  { name: "--diagram-border", fallback: "#ffffff" },
  { name: "--diagram-string", fallback: "#ffffff" },
  { name: "--diagram-fret", fallback: "#ffffff" },
  { name: "--diagram-nut", fallback: "#ffffff" },
  { name: "--diagram-capo", fallback: "#ffd400" },
  { name: "--diagram-inlay", fallback: "#ffffff" },
  { name: "--diagram-selection", fallback: "#ffd400" },
  { name: "--note-root", fallback: "#ff4d4d" },
  { name: "--note-in-scale", fallback: "#ffd400" },
  { name: "--note-out-scale", fallback: "#ffffff" },
  { name: "--note-label", fallback: "#000000" },
  { name: "--note-stroke", fallback: "#ffffff" },
  { name: "--muted", fallback: "#e0e0e0" },
  { name: "--font-ui", fallback: "monospace" }
];

const getDiagramExportHeight = (diagram: NeckDiagram) => {
  const hasCaption = diagram.name?.trim().length > 0;
  const noteRadius = Math.max(MIN_NOTE_RADIUS, diagram.height / 18);
  const fretNumberHeight = Math.max(12, Math.round(noteRadius * 1.2));
  const fretNumberArea =
    diagram.config.showFretNumbers ? fretNumberHeight + FRET_NUMBER_MARGIN : 0;
  return diagram.height + fretNumberArea + (hasCaption ? EXPORT_CAPTION_HEIGHT : 0);
};

const toTilingDiagram = (diagram: NeckDiagram): NeckDiagram => ({
  ...diagram,
  height: getDiagramExportHeight(diagram)
});

const svgToImage = (svg: SVGSVGElement, caption?: string) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (typeof window !== "undefined") {
    const styles = getComputedStyle(document.documentElement);
    SVG_EXPORT_VARS.forEach(({ name, fallback }) => {
      const value = styles.getPropertyValue(name).trim() || fallback;
      if (value) {
        clone.style.setProperty(name, value);
      }
    });
  }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const width = Number(svg.getAttribute("width") ?? svg.clientWidth);
  const height = Number(svg.getAttribute("height") ?? svg.clientHeight);
  const exportExtra = Number(svg.dataset.exportHeight ?? 0);
  const extraHeight = Number.isFinite(exportExtra) ? exportExtra : 0;
  let finalHeight = height + extraHeight;

  if (caption && caption.trim().length > 0) {
    finalHeight += EXPORT_CAPTION_HEIGHT;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", `${width / 2}`);
    text.setAttribute("y", `${height + extraHeight + EXPORT_CAPTION_HEIGHT / 2}`);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute(
      "font-family",
      "'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', 'Hack Nerd Font', 'NerdFontsSymbols Nerd Font', monospace"
    );
    text.setAttribute("font-size", "14");
    const muted = getCssVar("--muted", "#9aa7b2");
    text.setAttribute("fill", muted);
    text.textContent = caption;
    clone.appendChild(text);
  }

  clone.setAttribute("width", `${width}`);
  clone.setAttribute("height", `${finalHeight}`);

  const serialized = new XMLSerializer().serializeToString(clone);
  const encoded = window.btoa(unescape(encodeURIComponent(serialized)));
  const src = `data:image/svg+xml;base64,${encoded}`;

  return new Promise<{ image: HTMLImageElement; width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, width, height: finalHeight });
    image.onerror = () => reject(new Error("Failed to load SVG image."));
    image.src = src;
  });
};

const getCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value?.trim() || fallback;
};

const normalizeNotes = (notes: Note[]) => {
  const deduped = new Map<string, Note>();
  notes.forEach((note) => {
    deduped.set(`${note.stringIndex}:${note.fret}`, note);
  });
  return Array.from(deduped.values());
};

const clampNotesToConfig = (notes: Note[], strings: number, frets: number) =>
  normalizeNotes(
    notes.filter(
      (note) =>
        note.stringIndex >= 0 &&
        note.stringIndex < strings &&
        note.fret >= -1 &&
        note.fret < frets
    )
  );

const getDisplayTitle = (record: ProjectRecord | null) => {
  if (!record) return "";
  const title = record.title ?? "";
  if (title === DEFAULT_PROJECT_TITLE && record.data?.diagrams?.length === 0) {
    return "";
  }
  return title;
};

const isAutoTabName = (name?: string) => {
  if (!name) return true;
  return /^Tab\s+\d+$/i.test(name.trim());
};

const getTabDisplayName = (tab: ProjectTab, index: number) => {
  const trimmed = tab.name?.trim() ?? "";
  if (isAutoTabName(trimmed)) {
    return `Tab ${index + 1}`;
  }
  return trimmed || `Tab ${index + 1}`;
};

const getPositionPreset = (positionName?: string) => {
  if (!positionName) return null;
  const normalized = positionName.trim().toLowerCase();
  return POSITION_PRESETS[normalized] ?? null;
};

const getPositionRange = (positionName: string | undefined, frets: number) => {
  const preset = getPositionPreset(positionName);
  if (!preset || frets <= 0) return null;
  const maxFret = Math.min(preset.maxFret, frets - 1);
  const minFret = Math.min(preset.minFret, maxFret);
  return { minFret, maxFret };
};

const resolveDisplayTuning = (diagram: NeckDiagram) =>
  diagram.config.displayStandardTuning
    ? getStandardTuning(diagram.config.strings)
    : diagram.config.tuning;

const buildScaleNotes = (
  diagram: NeckDiagram,
  rootKey: string | undefined,
  scaleIntervals: number[] | null | undefined,
  positionName?: string
) => {
  if (!rootKey || !scaleIntervals || scaleIntervals.length === 0) return [];
  const rootIndex = noteNameToIndex(rootKey);
  if (rootIndex === null) return [];
  const scaleSet = new Set(scaleIntervals.map((interval) => (rootIndex + interval) % 12));
  const displayTuning = resolveDisplayTuning(diagram);
  const positionRange = getPositionRange(positionName, diagram.config.frets);
  const notes: Note[] = [];
  for (let stringIndex = 0; stringIndex < diagram.config.strings; stringIndex += 1) {
    for (let fret = -1; fret < diagram.config.frets; fret += 1) {
      const fretValue = fret < 0 ? 0 : fret;
      if (positionRange) {
        if (fretValue < positionRange.minFret || fretValue > positionRange.maxFret) continue;
      }
      const noteIndex = getNoteIndex(
        displayTuning,
        stringIndex,
        fret,
        diagram.config.capo
      );
      if (noteIndex === null) continue;
      if (!scaleSet.has(noteIndex)) continue;
      notes.push({
        id: crypto.randomUUID(),
        stringIndex,
        fret
      });
    }
  }
  return notes;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
};

type AppMode = "studio" | "demo";
type AppProps = { mode?: AppMode };

const App = ({ mode = "studio" }: AppProps) => {
  const isDemo = mode === "demo";
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isRemote, setIsRemote] = useState(true);
  const [defaultLabelMode, setDefaultLabelMode] = useState<LabelMode>("key");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryType, setLibraryType] = useState("all");
  const [libraryResults, setLibraryResults] = useState<LibraryItem[]>([]);
  const [libraryIndex, setLibraryIndex] = useState<Record<string, LibraryItem>>({});
  const [keyOptions, setKeyOptions] = useState<LibraryItem[]>([]);
  const [scaleOptions, setScaleOptions] = useState<LibraryItem[]>([]);
  const [positionOptions, setPositionOptions] = useState<LibraryItem[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [exporting, setExporting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY);
    if (stored == null) return true;
    return stored === "true";
  });
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importMode, setImportMode] = useState<"diagram" | "page" | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [titleInput, setTitleInput] = useState("");
  const [showDeleteWarning, setShowDeleteWarning] = useState(true);
  const [deletePrompt, setDeletePrompt] = useState<DeleteAction | null>(null);
  const [deletePromptDontShow, setDeletePromptDontShow] = useState(false);
  const [selectionTarget, setSelectionTarget] = useState<"diagram" | "tab" | "none">("none");
  const [draggingDiagramId, setDraggingDiagramId] = useState<string | null>(null);
  const [trashHoverDiagramId, setTrashHoverDiagramId] = useState<string | null>(null);
  const [renamingDiagramId, setRenamingDiagramId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [showPageDate, setShowPageDate] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored && isThemeId(stored) ? stored : DEFAULT_THEME;
  });
  const [panelOpen, setPanelOpen] = useState({
    worksheets: true,
    theory: true,
    diagram: true,
    instrument: true,
    settings: true
  });
  const [currentWorksheet, setCurrentWorksheet] = useState<Worksheet | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(WORKSHEETS_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as unknown;
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Worksheet).items))
        return null;
      const w = parsed as Worksheet;
      return {
        id: w.id ?? `worksheet:${crypto.randomUUID()}`,
        title: typeof w.title === "string" ? w.title : "Untitled",
        sourceRef: w.sourceRef,
        items: Array.isArray(w.items) ? w.items : []
      };
    } catch {
      return null;
    }
  });
  const [worksheetError, setWorksheetError] = useState<string | null>(null);
  const [worksheetPasteInput, setWorksheetPasteInput] = useState("");
  const worksheetFileInputRef = useRef<HTMLInputElement | null>(null);
  const migratedProjectRef = useRef<string | null>(null);
  const projectRef = useRef<ProjectRecord | null>(null);
  const activeTabIdRef = useRef<string | null>(null);
  const canvasZoomRef = useRef(1);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const trashRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const requestDeleteRef = useRef<(action: DeleteAction | null) => void>(() => {});
  const expandedSidebarWidthRef = useRef(320);
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [outlineLocked, setOutlineLocked] = useState<OutlineMetrics | null>(null);
  const isSidebarCompact = !sidebarCollapsed && sidebarWidth <= MIN_SIDEBAR_WIDTH;

  const tabs = (project?.data.tabs ?? []).filter((tab) => tab?.id);
  const activeTabId = project?.data.activeTabId ?? tabs[0]?.id ?? null;
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTabId);
  const activeTab = activeTabIndex >= 0 ? tabs[activeTabIndex] : null;
  const activeTabName = activeTab ? getTabDisplayName(activeTab, activeTabIndex) : "";
  const hasCustomTabTitle = activeTab ? !isAutoTabName(activeTab.name) : false;
  const diagramsInActiveTab = useMemo(() => {
    if (!project || !activeTabId) return [];
    return project.data.diagrams.filter((diagram) => diagram.tabId === activeTabId);
  }, [project, activeTabId]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    canvasZoomRef.current = canvasZoom;
  }, [canvasZoom]);

  const selectedDiagram = useMemo(() => {
    if (!project?.data.selectedDiagramId || !activeTabId) return null;
    const diagram =
      project.data.diagrams.find((item) => item.id === project.data.selectedDiagramId) ?? null;
    if (!diagram || diagram.tabId !== activeTabId) return null;
    return diagram;
  }, [project, activeTabId]);

  const isGridDiagram = (diagram: NeckDiagram) => diagram.layoutMode !== "float";

  const getFloatingPosition = (size: { width: number; height: number }) => {
    const x = Math.max(TILE_GAP, canvasSize.width / 2 - size.width / 2);
    const y = TILE_GAP;
    return { x, y };
  };

  const outlineMetrics = useMemo(() => {
    if (!sidebarCollapsed) return null;
    const offsetX = sidebarOffset;
    if (diagramsInActiveTab.length === 0) {
      const visibleW = (canvasSize.width - 2 * CANVAS_SURFACE_PADDING) / canvasZoom;
      const visibleH = (canvasSize.height - 2 * CANVAS_SURFACE_PADDING) / canvasZoom;
      return {
        width: US_LETTER_SIZE.width,
        height: US_LETTER_SIZE.height,
        left: Math.max(0, visibleW / 2 - US_LETTER_SIZE.width / 2),
        top: Math.max(0, visibleH / 2 - US_LETTER_SIZE.height / 2)
      };
    }
    const minX = Math.min(...diagramsInActiveTab.map((diagram) => diagram.x));
    const maxX = Math.max(...diagramsInActiveTab.map((diagram) => diagram.x + diagram.width));
    const minY = Math.min(...diagramsInActiveTab.map((diagram) => diagram.y));
    const maxY = Math.max(
      ...diagramsInActiveTab.map((diagram) => diagram.y + getDiagramExportHeight(diagram))
    );
    const contentWidth = Math.max(1, maxX - minX + OUTLINE_PADDING * 2);
    const contentHeight = Math.max(1, maxY - minY + OUTLINE_PADDING * 2);
    const scale = Math.max(
      1,
      contentWidth / US_LETTER_SIZE.width,
      contentHeight / US_LETTER_SIZE.height
    );
    const width = US_LETTER_SIZE.width * scale;
    const height = US_LETTER_SIZE.height * scale;
    const centerX = (minX + maxX) / 2 + offsetX;
    const centerY = (minY + maxY) / 2;
    return {
      width,
      height,
      left: centerX - width / 2,
      top: centerY - height / 2
    };
  }, [sidebarCollapsed, diagramsInActiveTab, canvasSize, canvasZoom, sidebarOffset]);

  useEffect(() => {
    if (dragging && sidebarCollapsed) {
      setOutlineLocked((prev) => prev ?? outlineMetrics);
      return;
    }
    if (!dragging) {
      setOutlineLocked(null);
    }
  }, [dragging, sidebarCollapsed]);

  const selectedKey = project?.data.keyId ? libraryIndex[project.data.keyId] : undefined;
  const selectedScale = project?.data.scaleId ? libraryIndex[project.data.scaleId] : undefined;

  useEffect(() => {
    let mounted = true;

    if (isDemo) {
      const demo = createDemoProject();
      const now = new Date().toISOString();
      const record: ProjectRecord = {
        id: `demo-${crypto.randomUUID()}`,
        title: DEMO_PROJECT_TITLE,
        data: demo,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now
      };
      setProject(record);
      setIsRemote(false);
      setStatus("ready");
      setTitleInput(getDisplayTitle(record));
      return () => {
        mounted = false;
      };
    }

    const load = async () => {
      try {
        const last = await fetchLastProject();
        if (!mounted) return;
        if (last) {
          setProject(last);
          saveLocalProject(last);
          setIsRemote(true);
          setTitleInput(getDisplayTitle(last));
        } else {
          const blank = createBlankProject();
          const created = await createProject(DEFAULT_PROJECT_TITLE, blank);
          if (!mounted) return;
          setProject(created);
          saveLocalProject(created);
          setIsRemote(true);
          setTitleInput(getDisplayTitle(created));
        }
        setStatus("ready");
      } catch (error) {
        const local = loadLocalProject();
        if (local) {
          setProject(local);
          setIsRemote(false);
          setStatus("ready");
          setTitleInput(getDisplayTitle(local));
          return;
        }

        const blank = createBlankProject();
        const now = new Date().toISOString();
        setProject({
          id: `local-${crypto.randomUUID()}`,
          title: DEFAULT_PROJECT_TITLE,
          data: blank,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now
        });
        setIsRemote(false);
        setStatus("ready");
        setTitleInput("");
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isDemo]);

  useEffect(() => {
    const stored = localStorage.getItem(DELETE_WARNING_STORAGE_KEY);
    if (stored === "false") {
      setShowDeleteWarning(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DELETE_WARNING_STORAGE_KEY, String(showDeleteWarning));
  }, [showDeleteWarning]);

  useEffect(() => {
    const stored = localStorage.getItem(PAGE_DATE_STORAGE_KEY);
    if (stored === "true") {
      setShowPageDate(true);
    } else if (stored === "false") {
      setShowPageDate(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PAGE_DATE_STORAGE_KEY, String(showPageDate));
  }, [showPageDate]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (sidebarCollapsed) return;
    if (sidebarWidth > MIN_SIDEBAR_WIDTH) {
      expandedSidebarWidthRef.current = sidebarWidth;
    }
  }, [sidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    if (!project) return;
    if (migratedProjectRef.current === project.id) return;
    migratedProjectRef.current = project.id;
    const { keyId, scaleId, positionId } = project.data;
    const existingTabs = Array.isArray(project.data.tabs)
      ? project.data.tabs.filter((tab) => tab?.id)
      : [];
    const tabs = existingTabs.length > 0 ? existingTabs : [createDefaultTab()];
    const activeTabId =
      project.data.activeTabId && tabs.some((tab) => tab.id === project.data.activeTabId)
        ? project.data.activeTabId
        : tabs[0].id;
    const needsTheoryMigration =
      !!(keyId || scaleId || positionId) &&
      project.data.diagrams.some(
        (diagram) =>
          diagram.keyId == null &&
          diagram.scaleId == null &&
          diagram.positionId == null
      );
    const needsTabMigration =
      existingTabs.length === 0 ||
      !project.data.activeTabId ||
      !tabs.some((tab) => tab.id === project.data.activeTabId) ||
      project.data.diagrams.some(
        (diagram) => !diagram.tabId || !tabs.some((tab) => tab.id === diagram.tabId)
      );
    const needsConfigCleanup = project.data.diagrams.some((diagram) => {
      if (!diagram.config || typeof diagram.config !== "object") return false;
      return "scaleLength" in (diagram.config as Record<string, unknown>);
    });
    const needsNoteCleanup = project.data.diagrams.some((diagram) => {
      const seen = new Set<string>();
      for (const note of diagram.notes) {
        const key = `${note.stringIndex}:${note.fret}`;
        if (seen.has(key)) return true;
        seen.add(key);
      }
      return false;
    });
    const needsLayoutMigration = project.data.diagrams.some(
      (diagram) => diagram.layoutMode == null
    );
    if (
      !needsTheoryMigration &&
      !needsNoteCleanup &&
      !needsTabMigration &&
      !needsLayoutMigration &&
      !needsConfigCleanup
    ) {
      return;
    }
    updateProjectData((data) => ({
      ...data,
      tabs,
      activeTabId,
      diagrams: data.diagrams.map((diagram) => ({
        ...diagram,
        tabId: tabs.some((tab) => tab.id === diagram.tabId) ? diagram.tabId : activeTabId,
        keyId: needsTheoryMigration ? diagram.keyId ?? data.keyId : diagram.keyId,
        scaleId: needsTheoryMigration ? diagram.scaleId ?? data.scaleId : diagram.scaleId,
        positionId: needsTheoryMigration
          ? diagram.positionId ?? data.positionId
          : diagram.positionId,
        notes: needsNoteCleanup ? normalizeNotes(diagram.notes) : diagram.notes,
        layoutMode: needsLayoutMigration ? diagram.layoutMode ?? "grid" : diagram.layoutMode,
        config: needsConfigCleanup ? stripScaleLength(diagram.config) : diagram.config
      }))
    }));
  }, [project]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!project || !activeTabId) return;
    const diagramsInTab = project.data.diagrams.filter((diagram) => diagram.tabId === activeTabId);
    const gridDiagrams = diagramsInTab.filter(isGridDiagram);
    const floatingDiagrams = diagramsInTab.filter((diagram) => !isGridDiagram(diagram));
    if (gridDiagrams.length === 0) return;

    const hasGridOverlap = gridDiagrams.some((diagram, index) =>
      gridDiagrams.slice(index + 1).some((other) => boxesOverlap(diagram, other, TILE_GAP))
    );
    const hasFloatOverlap = floatingDiagrams.some((floating) =>
      gridDiagrams.some((diagram) => boxesOverlap(floating, diagram, TILE_GAP))
    );
    if (!hasGridOverlap && !hasFloatOverlap) return;

    const orderedGrid = [...gridDiagrams].sort((a, b) =>
      a.y === b.y ? a.x - b.x : a.y - b.y
    );
    const placed: NeckDiagram[] = [];
    const floatingForTile = floatingDiagrams.map(toTilingDiagram);
    const updates = new Map<string, { x: number; y: number }>();

    orderedGrid.forEach((diagram) => {
      const position = suggestTile(
        [...placed, ...floatingForTile],
        canvasSize,
        { width: diagram.width, height: getDiagramExportHeight(diagram) },
        TILE_GAP
      );
      placed.push({ ...diagram, x: position.x, y: position.y, height: getDiagramExportHeight(diagram) });
      updates.set(diagram.id, position);
    });

    const hasChanges = orderedGrid.some((diagram) => {
      const next = updates.get(diagram.id);
      return next ? next.x !== diagram.x || next.y !== diagram.y : false;
    });
    if (!hasChanges) return;

    updateProjectData((data) => ({
      ...data,
      diagrams: data.diagrams.map((diagram) => {
        const next = updates.get(diagram.id);
        return next ? { ...diagram, x: next.x, y: next.y } : diagram;
      })
    }));
  }, [project, activeTabId, canvasSize]);

  useEffect(() => {
    let active = true;
    const loadLibrary = async () => {
      const [keysResult, scalesResult, modesResult, positionsResult] = await Promise.allSettled([
        fetchLibrary("", "key"),
        fetchLibrary("", "scale"),
        fetchLibrary("", "mode"),
        fetchLibrary("", "position")
      ]);

      if (!active) return;

      const resolveItems = (
        result: PromiseSettledResult<LibraryItem[]>,
        fallback: LibraryItem[]
      ) => (result.status === "fulfilled" && result.value.length > 0 ? result.value : fallback);

      const keys = resolveItems(keysResult, DEFAULT_KEYS);
      const scales = resolveItems(scalesResult, DEFAULT_SCALES);
      const modes = resolveItems(modesResult, DEFAULT_MODES);
      const positionsResultItems = resolveItems(positionsResult, DEFAULT_POSITIONS);
      const positionsByName = new Map(
        positionsResultItems.map((item) => [item.name.toLowerCase(), item])
      );
      const positions = DEFAULT_POSITIONS.map((fallback) =>
        positionsByName.get(fallback.name.toLowerCase()) ?? fallback
      );

      setKeyOptions(keys);
      setPositionOptions(positions);
      const combined = [...scales, ...modes].sort((a, b) => a.name.localeCompare(b.name));
      setScaleOptions(combined);
      const nextIndex: Record<string, LibraryItem> = {};
      [...keys, ...combined, ...positions].forEach((item) => {
        nextIndex[item.id] = item;
      });
      setLibraryIndex((prev) => ({ ...prev, ...nextIndex }));
    };

    loadLibrary();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      try {
        const type = libraryType === "all" ? undefined : libraryType;
        const results = await fetchLibrary(libraryQuery, type);
        if (!active) return;
        const allowedPositionNames = new Set(
          DEFAULT_POSITIONS.map((item) => item.name.toLowerCase())
        );
        const filtered = results.filter((item) => {
          if (item.type === "shape") return false;
          if (item.type === "position") {
            return allowedPositionNames.has(item.name.toLowerCase());
          }
          return true;
        });
        setLibraryResults(filtered);
        const nextIndex: Record<string, LibraryItem> = {};
        filtered.forEach((item) => {
          nextIndex[item.id] = item;
        });
        setLibraryIndex((prev) => ({ ...prev, ...nextIndex }));
      } catch {
        if (!active) return;
        const query = libraryQuery.trim().toLowerCase();
        const fallbackItems = [...keyOptions, ...scaleOptions, ...positionOptions];
        const allowedPositionNames = new Set(
          DEFAULT_POSITIONS.map((item) => item.name.toLowerCase())
        );
        const filtered = fallbackItems.filter((item) => {
          if (item.type === "shape") return false;
          if (libraryType !== "all" && item.type !== libraryType) return false;
          if (item.type === "position") {
            return (
              allowedPositionNames.has(item.name.toLowerCase()) &&
              (query.length === 0 || item.name.toLowerCase().includes(query))
            );
          }
          if (query.length === 0) return true;
          return item.name.toLowerCase().includes(query);
        });
        setLibraryResults(filtered);
      }
    };

    if (libraryQuery.length > 0 || libraryType !== "all") {
      fetchResults();
    } else {
      setLibraryResults([]);
    }

    return () => {
      active = false;
    };
  }, [libraryQuery, libraryType, keyOptions, scaleOptions, positionOptions]);

  useDebouncedEffect(() => {
    if (!project) return;
    if (isDemo) return;
    saveLocalProject(project);
    if (!isRemote) return;
    updateProject(project.id, {
      title: project.title,
      data: project.data,
      lastOpenedAt: new Date().toISOString()
    }).catch(() => {
      setIsRemote(false);
    });
  }, [project, isRemote, isDemo], 800);

  useEffect(() => {
    if (!dragging) return;

    const isOverTrash = (diagramId: string) => {
      const trashRect = trashRef.current?.getBoundingClientRect();
      if (!trashRect) return false;
      const diagramEl = document.querySelector(
        `[data-diagram-wrapper="${diagramId}"]`
      ) as HTMLElement | null;
      if (!diagramEl) return false;
      const diagramRect = diagramEl.getBoundingClientRect();
      return !(
        diagramRect.right < trashRect.left ||
        diagramRect.left > trashRect.right ||
        diagramRect.bottom < trashRect.top ||
        diagramRect.top > trashRect.bottom
      );
    };

    const handleMove = (event: PointerEvent) => {
      const dragState = dragRef.current;
      if (!dragState) return;
      const zoomFactor = canvasZoomRef.current || 1;
      const dx = (event.clientX - dragState.startX) / zoomFactor;
      const dy = (event.clientY - dragState.startY) / zoomFactor;
      const distance = Math.hypot(dx, dy);

      if (!dragState.hasMoved && distance < DRAG_THRESHOLD) {
        return;
      }

      if (!dragState.hasMoved) {
        dragState.hasMoved = true;
        setDragMode(dragState.mode);
        setDraggingDiagramId(dragState.mode === "move" ? dragState.id : null);
      }

      if (dragState.mode === "move") {
        const overTrash = isOverTrash(dragState.id);
        setTrashHoverDiagramId(overTrash ? dragState.id : null);
      } else {
        setTrashHoverDiagramId(null);
      }

      setProject((prev) => {
        if (!prev) return prev;
        const diagrams = prev.data.diagrams.map((diagram) => {
          if (diagram.id !== dragState.id) return diagram;
          if (dragState.mode === "move") {
            const nextX = dragState.origin.x + dx;
            const nextY = dragState.origin.y + dy;
            if (!diagram.config.snapToGrid) {
              return { ...diagram, x: nextX, y: nextY, layoutMode: "float" };
            }
            const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
            return { ...diagram, x: snap(nextX), y: snap(nextY), layoutMode: "float" };
          }
          if (dragState.mode === "resize") {
            return {
              ...diagram,
              width: clampValue(dragState.origin.width + dx, MIN_WIDTH, MAX_WIDTH),
              height: clampValue(dragState.origin.height + dy, MIN_HEIGHT, MAX_HEIGHT)
            };
          }
          const scale = Math.max(
            0.2,
            Math.max(
              (dragState.origin.width + dx) / dragState.origin.width,
              (dragState.origin.height + dy) / dragState.origin.height
            )
          );
          return {
            ...diagram,
            width: clampValue(dragState.origin.width * scale, MIN_WIDTH, MAX_WIDTH),
            height: clampValue(dragState.origin.height * scale, MIN_HEIGHT, MAX_HEIGHT)
          };
        });
        return {
          ...prev,
          data: {
            ...prev.data,
            diagrams,
            updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
      });
    };

    const handleUp = (event: PointerEvent) => {
      const dragState = dragRef.current;
      const didMove = dragState?.hasMoved ?? false;
      const shouldDelete =
        didMove && dragState?.mode === "move" && dragState?.id
          ? isOverTrash(dragState.id)
          : false;
      const currentActiveTabId = activeTabIdRef.current;
      const dropTabId =
        didMove && dragState?.mode === "move"
          ? getTabDropTarget(event.clientX, event.clientY)
          : null;
      const shouldMove =
        dropTabId && dragState?.id && dropTabId !== currentActiveTabId ? dropTabId : null;
      dragRef.current = null;
      setDragging(false);
      setDragMode(null);
      setDraggingDiagramId(null);
      setTrashHoverDiagramId(null);
      if (!didMove) return;
      if (shouldDelete && dragState?.id) {
        requestDeleteRef.current({ type: "diagram", id: dragState.id });
        return;
      }
      if (shouldMove && dragState?.id) {
        moveDiagramToTab(dragState.id, shouldMove);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!resizingSidebar) return;

    const handleMove = (event: PointerEvent) => {
      const nextWidth = clampValue(event.clientX, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);
      setSidebarWidth(nextWidth);
    };

    const handleUp = () => {
      setResizingSidebar(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [resizingSidebar]);

  useEffect(() => {
    if (!importMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!importMenuRef.current) return;
      if (!importMenuRef.current.contains(event.target as Node)) {
        setImportMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImportMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [importMenuOpen]);

  useEffect(() => {
    if (!exportMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExportMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [exportMenuOpen]);

  useEffect(() => {
    if (!project || !activeTabId) return;
    const diagramsInTab = project.data.diagrams.filter((diagram) => diagram.tabId === activeTabId);
    const selectedId = project.data.selectedDiagramId;
    if (!selectedId) return;
    const isSelectedInTab = diagramsInTab.some((diagram) => diagram.id === selectedId);
    if (isSelectedInTab) return;
    updateProjectData((data) => ({
      ...data,
      selectedDiagramId: undefined
    }));
  }, [project, activeTabId]);

  useEffect(() => {
    if (!sidebarCollapsed || diagramsInActiveTab.length === 0) {
      setSidebarOffset(0);
      return;
    }

    const widths = diagramsInActiveTab.map((diagram) => ({
      left: diagram.x,
      right: diagram.x + diagram.width
    }));
    const minX = Math.min(...widths.map((item) => item.left));
    const maxX = Math.max(...widths.map((item) => item.right));
    const visibleWidth = canvasSize.width - 2 * CANVAS_SURFACE_PADDING;
    const viewportWidth = visibleWidth / canvasZoom;
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || viewportWidth <= 0) {
      setSidebarOffset(0);
      return;
    }

    const contentCenter = (minX + maxX) / 2;
    const desiredOffset = viewportWidth / 2 - contentCenter;
    const minOffset = -minX;
    const maxOffset = viewportWidth - maxX;

    if (minOffset > maxOffset) {
      setSidebarOffset(0);
      return;
    }

    setSidebarOffset(Math.min(maxOffset, Math.max(minOffset, desiredOffset)));
  }, [sidebarCollapsed, canvasSize.width, canvasZoom, activeTabId, diagramsInActiveTab.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSlash = event.key === "/" || event.key === "?";
      if (!isSlash) return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      setSidebarCollapsed((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      handleDeselect();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if (deletePrompt) return;
      const isDeleteKey = event.key === "Backspace" || event.key === "Delete";
      if (!isDeleteKey) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      const selectedId = selectedDiagram?.id;
      if (selectionTarget === "diagram") {
        if (selectedId) {
          requestDeleteRef.current({ type: "diagram", id: selectedId });
        }
        return;
      }
      if (selectionTarget === "tab") {
        if (activeTabId) {
          requestDeleteRef.current({ type: "tab", id: activeTabId });
        }
      }
    };

    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [deletePrompt, selectionTarget, selectedDiagram?.id, activeTabId]);

  useEffect(() => {
    const handleRenameKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (deletePrompt) return;
      if (renamingDiagramId) return;
      if (isEditableTarget(event.target)) return;
      if (!selectedDiagram) return;
      event.preventDefault();
      beginRename(selectedDiagram);
    };

    window.addEventListener("keydown", handleRenameKey);
    return () => window.removeEventListener("keydown", handleRenameKey);
  }, [deletePrompt, renamingDiagramId, selectedDiagram]);

  useEffect(() => {
    if (!deletePrompt) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDelete();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        confirmDelete();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [deletePrompt, deletePromptDontShow]);

  const updateProjectData = (updater: (data: ProjectData) => ProjectData) => {
    setProject((prev) => {
      if (!prev) return prev;
      const nextData = updater(prev.data);
      return {
        ...prev,
        data: {
          ...nextData,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const resolveLibraryItem = (
    id: string | undefined,
    fallback: LibraryItem[]
  ) => {
    if (!id) return undefined;
    return libraryIndex[id] ?? fallback.find((item) => item.id === id);
  };

  const buildTheoryName = (
    keyId?: string,
    scaleId?: string,
    positionId?: string
  ) => {
    const keyName = resolveLibraryItem(keyId, keyOptions)?.name;
    const scaleName = resolveLibraryItem(scaleId, scaleOptions)?.name;
    const positionName = resolveLibraryItem(positionId, positionOptions)?.name;
    return [keyName, scaleName, positionName].filter(Boolean).join(" - ");
  };

  const getDiagramTheoryName = (diagram: NeckDiagram) =>
    buildTheoryName(diagram.keyId, diagram.scaleId, diagram.positionId);

  const handleAddDiagram = () => {
    if (!project) return;
    setSelectionTarget("diagram");
    let nextTabs = project.data.tabs ?? [];
    let targetTabId = activeTabId ?? project.data.activeTabId ?? nextTabs[0]?.id;
    if (!targetTabId) {
      const fallbackTab = createDefaultTab();
      nextTabs = [fallbackTab];
      targetTabId = fallbackTab.id;
    }
    const diagramsForTile = project.data.diagrams.filter(
      (diagram) => diagram.tabId === targetTabId
    );
    const isFirstInTab = diagramsForTile.length === 0;
    const gridDiagrams = diagramsForTile.filter(isGridDiagram);
    const gridForTile = gridDiagrams.map(toTilingDiagram);
    const defaultTileSize = {
      width: DEFAULT_DIAGRAM_SIZE.width,
      height: DEFAULT_DIAGRAM_SIZE.height + EXPORT_CAPTION_HEIGHT
    };
    const position = isFirstInTab
      ? getFloatingPosition(DEFAULT_DIAGRAM_SIZE)
      : suggestTile(gridForTile, canvasSize, defaultTileSize, TILE_GAP);
    const nameIndex = project.data.diagrams.length + 1;
    const diagram = createNeckDiagram({
      x: position.x,
      y: position.y,
      name: `Neck ${nameIndex}`,
      labelMode: defaultLabelMode,
      tabId: targetTabId,
      layoutMode: isFirstInTab ? "float" : "grid"
    });
    updateProjectData((data) => ({
      ...data,
      tabs: nextTabs,
      diagrams: [...data.diagrams, diagram],
      selectedDiagramId: diagram.id,
      activeTabId: targetTabId
    }));
  };

  const buildDiagramNotes = (
    diagram: NeckDiagram,
    keyId: string | undefined,
    scaleId: string | undefined,
    positionId: string | undefined,
    index: Record<string, LibraryItem>
  ) => {
    const rootKey =
      (keyId ? index[keyId]?.name : undefined) ??
      resolveLibraryItem(keyId, keyOptions)?.name;
    const scaleIntervals =
      (scaleId ? index[scaleId]?.intervals ?? null : null) ??
      resolveLibraryItem(scaleId, scaleOptions)?.intervals ??
      null;
    const positionName =
      (positionId ? index[positionId]?.name : undefined) ??
      resolveLibraryItem(positionId, positionOptions)?.name;
    return buildScaleNotes(diagram, rootKey, scaleIntervals, positionName);
  };

  const updateTheorySelection = (
    patch: {
      keyId?: string;
      scaleId?: string;
      positionId?: string;
    },
    indexOverride?: Record<string, LibraryItem>
  ) => {
    const index = indexOverride ?? libraryIndex;
    updateProjectData((data) => {
      const hasKey = Object.prototype.hasOwnProperty.call(patch, "keyId");
      const hasScale = Object.prototype.hasOwnProperty.call(patch, "scaleId");
      const hasPosition = Object.prototype.hasOwnProperty.call(patch, "positionId");
      const nextKeyId = hasKey ? patch.keyId : data.keyId;
      const nextScaleId = hasScale ? patch.scaleId : data.scaleId;
      const nextPositionId = hasPosition ? patch.positionId : data.positionId;
      return {
        ...data,
        keyId: nextKeyId,
        scaleId: nextScaleId,
        positionId: nextPositionId,
        diagrams: data.diagrams.map((diagram) => {
          const updated = {
            ...diagram,
            keyId: nextKeyId,
            scaleId: nextScaleId,
            positionId: nextPositionId
          };
          return {
            ...updated,
            notes: buildDiagramNotes(
              updated,
              nextKeyId,
              nextScaleId,
              nextPositionId,
              index
            )
          };
        })
      };
    });
  };

  const handleAddDiagramFromTheory = (replaceId?: string) => {
    if (!project) return;
    setSelectionTarget("diagram");
    let nextTabs = project.data.tabs ?? [];
    let targetTabId = activeTabId ?? project.data.activeTabId ?? nextTabs[0]?.id;
    if (!targetTabId) {
      const fallbackTab = createDefaultTab();
      nextTabs = [fallbackTab];
      targetTabId = fallbackTab.id;
    }
    const existing = replaceId
      ? project.data.diagrams.find((diagram) => diagram.id === replaceId)
      : undefined;
    if (replaceId) {
      if (existing) {
        targetTabId = existing.tabId ?? targetTabId;
      }
    }
    const diagramsForTile = project.data.diagrams.filter(
      (diagram) => diagram.tabId === targetTabId
    );
    const isFirstInTab = diagramsForTile.length === 0;
    const gridDiagrams = diagramsForTile.filter(isGridDiagram);
    const gridForTile = gridDiagrams.map(toTilingDiagram);
    const defaultTileSize = {
      width: DEFAULT_DIAGRAM_SIZE.width,
      height: DEFAULT_DIAGRAM_SIZE.height + EXPORT_CAPTION_HEIGHT
    };
    const position = isFirstInTab
      ? getFloatingPosition(DEFAULT_DIAGRAM_SIZE)
      : suggestTile(gridForTile, canvasSize, defaultTileSize, TILE_GAP);
    const nameIndex = project.data.diagrams.length + 1;
    const generatedName = buildTheoryName(
      project.data.keyId,
      project.data.scaleId,
      project.data.positionId
    );
    const selectedPositionName =
      resolveLibraryItem(project.data.positionId, positionOptions)?.name ??
      (project.data.positionId ? libraryIndex[project.data.positionId]?.name : undefined);
    const positionPreset = getPositionPreset(selectedPositionName);
    const baseConfig = existing?.config ?? DEFAULT_NECK_CONFIG;
    const nextFrets = positionPreset?.minFrets
      ? Math.max(baseConfig.frets, positionPreset.minFrets)
      : baseConfig.frets;
    const diagram = createNeckDiagram({
      x: position.x,
      y: position.y,
      name: generatedName || `Neck ${nameIndex}`,
      labelMode: existing?.labelMode ?? defaultLabelMode,
      tabId: targetTabId,
      layoutMode: isFirstInTab ? "float" : "grid",
      config: {
        ...baseConfig,
        frets: nextFrets,
        tuning: normalizeTuning(baseConfig.strings, baseConfig.tuning)
      },
      keyId: project.data.keyId,
      scaleId: project.data.scaleId,
      positionId: project.data.positionId
    });
    const rootKey =
      resolveLibraryItem(project.data.keyId, keyOptions)?.name ??
      (project.data.keyId ? libraryIndex[project.data.keyId]?.name : undefined);
    const scaleIntervals =
      resolveLibraryItem(project.data.scaleId, scaleOptions)?.intervals ??
      (project.data.scaleId ? libraryIndex[project.data.scaleId]?.intervals ?? null : null);
    const notes = buildScaleNotes(diagram, rootKey, scaleIntervals, selectedPositionName);
    updateProjectData((data) => {
      const nextDiagrams = replaceId
        ? data.diagrams.map((item) =>
            item.id === replaceId
              ? {
                  ...diagram,
                  id: replaceId,
                  x: item.x,
                  y: item.y,
                  width: item.width,
                  height: item.height,
                  layoutMode: item.layoutMode ?? diagram.layoutMode,
                  tabId: item.tabId,
                  name: diagram.name,
                  notes
                }
              : item
          )
        : [...data.diagrams, { ...diagram, notes }];
      return {
        ...data,
        tabs: nextTabs,
        diagrams: nextDiagrams,
        selectedDiagramId: replaceId ?? diagram.id,
        activeTabId: targetTabId
      };
    });
  };

  const setWorksheetFromJson = (json: string) => {
    setWorksheetError(null);
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Worksheet).items)) {
        setWorksheetError("Invalid worksheet: must have title and items array.");
        return;
      }
      const w = parsed as Worksheet;
      const id = (w as { id?: string }).id ?? `worksheet:${crypto.randomUUID()}`;
      const title = typeof w.title === "string" ? w.title : "Untitled Worksheet";
      const items = Array.isArray(w.items)
        ? w.items.filter(
            (i): i is WorksheetItem =>
              i != null && typeof i === "object" && typeof (i as WorksheetItem).name === "string"
          )
        : [];
      const next = { id, title, sourceRef: w.sourceRef, items };
      setCurrentWorksheet(next);
      try {
        localStorage.setItem(WORKSHEETS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    } catch {
      setWorksheetError("Invalid JSON.");
    }
  };

  const handleLoadBundledWorksheet = async (path: string) => {
    setWorksheetError(null);
    const base = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
    const url = path.startsWith("/") ? `${base.replace(/\/$/, "")}${path}` : path;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      setWorksheetFromJson(text);
    } catch (e) {
      setWorksheetError(e instanceof Error ? e.message : "Failed to load worksheet.");
    }
  };

  const handleRenderWorksheetToCanvas = () => {
    if (!project) return;
    if (!currentWorksheet || currentWorksheet.items.length === 0) {
      setWorksheetError("Add at least one item to the worksheet.");
      return;
    }
    setWorksheetError(null);
    setSelectionTarget("diagram");
    const tabName =
      currentWorksheet.title.trim().length > 0
        ? currentWorksheet.title.trim()
        : `Worksheet ${(project.data.tabs?.length ?? 0) + 1}`;
    const newTab = createDefaultTab(tabName);
    const nextTabs = [...(project.data.tabs ?? []), newTab];
    const targetTabId = newTab.id;
    const diagramsForTab: NeckDiagram[] = [];
    const gridDiagrams = diagramsForTab.filter(isGridDiagram);
    const gridForTile = gridDiagrams.map(toTilingDiagram);
    const defaultTileSize = {
      width: DEFAULT_DIAGRAM_SIZE.width,
      height: DEFAULT_DIAGRAM_SIZE.height + EXPORT_CAPTION_HEIGHT
    };
    const placed: NeckDiagram[] = [];
    for (const item of currentWorksheet.items) {
      const baseConfig = { ...DEFAULT_NECK_CONFIG, ...item.config };
      const tuning =
        baseConfig.tuning && baseConfig.tuning.length > 0
          ? baseConfig.tuning
          : getStandardTuning(baseConfig.strings);
      const config = {
        ...baseConfig,
        tuning: normalizeTuning(baseConfig.strings, tuning)
      };
      const position = suggestTile(
        [...gridForTile, ...placed.map(toTilingDiagram)],
        canvasSize,
        defaultTileSize,
        TILE_GAP
      );
      const positionName = resolveLibraryItem(item.positionId, positionOptions)?.name;
      const positionPreset = getPositionPreset(positionName);
      const nextFrets = positionPreset?.minFrets
        ? Math.max(config.frets, positionPreset.minFrets)
        : config.frets;
      const diagram = createNeckDiagram({
        x: position.x,
        y: position.y,
        name: item.name,
        tabId: targetTabId,
        layoutMode: gridForTile.length === 0 && placed.length === 0 ? "float" : "grid",
        config: { ...config, frets: nextFrets },
        keyId: item.keyId,
        scaleId: item.scaleId,
        positionId: item.positionId,
        labelMode: defaultLabelMode
      });
      const notes =
        item.notes && item.notes.length > 0
          ? item.notes.map((n) => ({ ...n, id: n.id || crypto.randomUUID() }))
          : buildDiagramNotes(diagram, item.keyId, item.scaleId, item.positionId, libraryIndex);
      placed.push({ ...diagram, notes });
    }
    updateProjectData((data) => ({
      ...data,
      tabs: nextTabs,
      diagrams: [...data.diagrams, ...placed],
      selectedDiagramId: placed[placed.length - 1]?.id ?? data.selectedDiagramId,
      activeTabId: targetTabId
    }));
    const pageTitle =
      currentWorksheet.title.trim().length > 0
        ? currentWorksheet.title.trim()
        : DEFAULT_PROJECT_TITLE;
    setTitleInput(pageTitle);
    setProject((prev) =>
      prev
        ? {
            ...prev,
            title: pageTitle,
            updatedAt: new Date().toISOString()
          }
        : prev
    );
  };

  const togglePanel = (panel: keyof typeof panelOpen) => {
    setPanelOpen((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const openPanelFromCompact = (panel: keyof typeof panelOpen) => {
    if (!isSidebarCompact) return;
    const nextWidth = expandedSidebarWidthRef.current || 320;
    setSidebarWidth(nextWidth);
    setPanelOpen((prev) => ({ ...prev, [panel]: true }));
  };

  const handleSelectDiagram = (diagramId: string) => {
    setSelectionTarget("diagram");
    updateProjectData((data) => ({
      ...data,
      selectedDiagramId: diagramId
    }));
  };

  const handleCanvasPointerDown = () => {
    setSelectionTarget("none");
    updateProjectData((data) => ({
      ...data,
      selectedDiagramId: undefined
    }));
  };

  const handleDeselect = () => {
    setSelectionTarget("none");
    updateProjectData((data) => ({
      ...data,
      selectedDiagramId: undefined
    }));
  };

  const beginRename = (diagram: NeckDiagram) => {
    setRenamingDiagramId(diagram.id);
    setRenameDraft(diagram.name);
  };

  const commitRename = (diagramId: string, nextName: string) => {
    const trimmed = nextName.trim();
    setRenamingDiagramId(null);
    setRenameDraft("");
    if (trimmed.length === 0) return;
    updateDiagram(diagramId, (diagram) => ({ ...diagram, name: trimmed }));
  };

  const cancelRename = () => {
    setRenamingDiagramId(null);
    setRenameDraft("");
  };

  const handleDiagramPointerDown = (
    event: PointerEvent<HTMLDivElement>,
    diagram: NeckDiagram
  ) => {
    event.stopPropagation();
    handleSelectDiagram(diagram.id);

    if (event.button !== 0) return;
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
    let mode: DragMode = "move";
    if (event.altKey) {
      mode = event.shiftKey ? "scale" : "resize";
    }
    dragRef.current = {
      id: diagram.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      origin: {
        x: diagram.x,
        y: diagram.y,
        width: diagram.width,
        height: diagram.height
      },
      hasMoved: false
    };
    setDragging(true);
    setDragMode(null);
    setDraggingDiagramId(null);
    setTrashHoverDiagramId(null);
  };

  const updateDiagram = (diagramId: string, updater: (diagram: NeckDiagram) => NeckDiagram) => {
    updateProjectData((data) => ({
      ...data,
      diagrams: data.diagrams.map((diagram) =>
        diagram.id === diagramId ? updater(diagram) : diagram
      )
    }));
  };

  const handleToggleNote = (diagramId: string, stringIndex: number, fret: number) => {
    updateDiagram(diagramId, (diagram) => {
      const existing = diagram.notes.find(
        (note) => note.stringIndex === stringIndex && note.fret === fret
      );
      if (existing) {
        if (diagram.labelMode === "picking") {
          if (existing.picking === "D") {
            return {
              ...diagram,
              notes: normalizeNotes(
                diagram.notes.map((note) =>
                  note.id === existing.id ? { ...note, picking: "U" } : note
                )
              )
            };
          }
          if (existing.picking == null) {
            return {
              ...diagram,
              notes: normalizeNotes(
                diagram.notes.map((note) =>
                  note.id === existing.id ? { ...note, picking: "D" } : note
                )
              )
            };
          }
        }
        return {
          ...diagram,
          notes: normalizeNotes(diagram.notes.filter((note) => note.id !== existing.id))
        };
      }

      return {
        ...diagram,
        notes: normalizeNotes([
          ...diagram.notes,
          {
            id: crypto.randomUUID(),
            stringIndex,
            fret,
            picking: diagram.labelMode === "picking" ? "D" : undefined
          }
        ])
      };
    });
  };

  const handleLabelModeChange = (mode: LabelMode) => {
    setDefaultLabelMode(mode);
    if (!selectedDiagram) return;
    updateDiagram(selectedDiagram.id, (diagram) => ({
      ...diagram,
      labelMode: mode
    }));
  };

  const buildExportName = (diagram: NeckDiagram) => {
    const base = slugify(`${project?.title ?? "neck-diagram"}-${diagram.name}`);
    if (base.length > 0) return base;
    return `neck-diagram-${diagram.id.slice(0, 6)}`;
  };

  const exportSelectedDiagramJson = () => {
    if (!selectedDiagram) return;
    const theoryName = getDiagramTheoryName(selectedDiagram);
    const baseName = theoryName || selectedDiagram.name || "diagram";
    const filename = `${slugify(baseName) || "diagram"}.json`;
    const exportedAt = new Date().toISOString();
    const payload = buildDiagramExportPayload(selectedDiagram, exportedAt);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPageJson = () => {
    if (!project || !activeTabId) return;
    if (diagramsInActiveTab.length === 0) {
      window.alert("Add a neck diagram before exporting.");
      return;
    }
    const tabName = activeTab ? getTabDisplayName(activeTab, activeTabIndex) : "Page";
    const suggested = tabName;
    const name = window.prompt("Name this export", suggested);
    if (!name || !name.trim()) return;
    const title = name.trim();
    const filename = `${slugify(title) || "neck-diagram"}.json`;
    const exportedAt = new Date();
    const payload = buildPageExportPayload({
      title,
      tabName,
      diagrams: diagramsInActiveTab,
      createdAt: project.data.createdAt,
      exportedAt: exportedAt.toISOString(),
      exportedOn: formatExportDate(exportedAt),
      keyId: project.data.keyId,
      scaleId: project.data.scaleId,
      positionId: project.data.positionId,
      searchQuery: project.data.searchQuery
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importPagesJson = async (file: File) => {
    const text = await file.text();
    const parsedResult = safeJsonParse(text);
    if (!parsedResult.ok) {
      window.alert("Invalid JSON file.");
      return;
    }
    const parsed = parsedResult.value;

    const fallbackTitle = file.name.replace(/\.json$/i, "").trim() || "Imported Project";
    const parsedPayload = parseProjectPayload(parsed);
    const title = parsedPayload.title?.trim() || fallbackTitle;
    const data = parsedPayload.data;

    if (!data) {
      window.alert("JSON does not contain a valid neck diagram project.");
      return;
    }

    if (!project) {
      const now = new Date().toISOString();
      const nextRecord: ProjectRecord = {
        id: `local-${crypto.randomUUID()}`,
        title,
        data,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now
      };
      setProject(nextRecord);
      saveLocalProject(nextRecord);
      setTitleInput(title);
      setIsRemote(false);
      return;
    }

    const hasExistingDiagrams = project.data.diagrams.length > 0;
    if (!hasExistingDiagrams) {
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          title,
          data,
          updatedAt: new Date().toISOString()
        };
      });
      setTitleInput(title);
      return;
    }

    updateProjectData((current) => {
      const existingTabs = current.tabs ?? [];
      const existingNames = new Set(existingTabs.map((tab) => tab.name.toLowerCase()));
      const tabIdMap = new Map<string, string>();
      const newTabs: ProjectTab[] = data.tabs ?? [createDefaultTab("Imported")];

      const mergedTabs = newTabs.map((tab, index) => {
        const baseName = tab.name?.trim() || `Imported ${index + 1}`;
        let nextName = baseName;
        let suffix = 2;
        while (existingNames.has(nextName.toLowerCase())) {
          nextName = `${baseName} ${suffix}`;
          suffix += 1;
        }
        existingNames.add(nextName.toLowerCase());
        const nextId = crypto.randomUUID();
        tabIdMap.set(tab.id, nextId);
        return { id: nextId, name: nextName };
      });

      const existingIds = new Set(current.diagrams.map((diagram) => diagram.id));
      const importedDiagrams = data.diagrams.map((diagram) => {
        const sourceTabId =
          diagram.tabId ??
          data.activeTabId ??
          newTabs[0]?.id ??
          mergedTabs[0]?.id;
        const targetTabId = tabIdMap.get(sourceTabId) ?? mergedTabs[0]?.id ?? sourceTabId;
        return normalizeImportedDiagram(diagram, targetTabId, existingIds);
      });

      return {
        ...current,
        tabs: [...existingTabs, ...mergedTabs],
        diagrams: [...current.diagrams, ...importedDiagrams],
        activeTabId: mergedTabs[0]?.id ?? current.activeTabId,
        selectedDiagramId: importedDiagrams[0]?.id ?? current.selectedDiagramId
      };
    });
  };

  const importDiagramJson = async (file: File) => {
    const text = await file.text();
    const parsedResult = safeJsonParse(text);
    if (!parsedResult.ok) {
      window.alert("Invalid JSON file.");
      return;
    }
    const parsed = parsedResult.value;

    const diagrams: NeckDiagram[] = [];
    if (parsed && typeof parsed === "object") {
      const record = parsed as { diagram?: unknown; diagrams?: unknown; data?: unknown };
      if (record.diagram && typeof record.diagram === "object") {
        diagrams.push(record.diagram as NeckDiagram);
      } else if (Array.isArray(record.diagrams)) {
        diagrams.push(...(record.diagrams as NeckDiagram[]));
      } else if (record.data && typeof record.data === "object") {
        const payload = parseProjectPayload(parsed);
        if (payload.data?.diagrams?.length) {
          diagrams.push(...payload.data.diagrams);
        }
      } else if ((parsed as NeckDiagram).config) {
        diagrams.push(parsed as NeckDiagram);
      }
    }

    if (diagrams.length === 0) {
      window.alert("JSON does not contain a valid diagram.");
      return;
    }

    updateProjectData((current) => {
      const fallbackTab = createDefaultTab();
      const tabs = current.tabs ?? [fallbackTab];
      const active = current.activeTabId ?? tabs[0]?.id ?? fallbackTab.id;
      const existingIds = new Set(current.diagrams.map((diagram) => diagram.id));
      const normalized = diagrams.map((diagram) =>
        normalizeImportedDiagram(diagram, active, existingIds)
      );
      return {
        ...current,
        tabs,
        activeTabId: active,
        diagrams: [...current.diagrams, ...normalized],
        selectedDiagramId: normalized[0]?.id ?? current.selectedDiagramId
      };
    });
  };

  const handleImportClick = (mode: "diagram" | "page") => {
    setImportMode(mode);
    importInputRef.current?.click();
  };

  const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (importMode === "diagram") {
      importDiagramJson(file);
    } else {
      importPagesJson(file);
    }
    setImportMode(null);
  };

  const adjustZoom = (delta: number) => {
    setCanvasZoom((prev) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev + delta).toFixed(2))))
    );
  };

  const resetZoom = () => setCanvasZoom(1);

  const handleTabSelect = (tabId: string) => {
    setSelectionTarget("tab");
    updateProjectData((data) => ({
      ...data,
      activeTabId: tabId
    }));
  };

  const handleAddTab = () => {
    if (!project) return;
    setSelectionTarget("tab");
    const nextIndex = (project.data.tabs?.length ?? 0) + 1;
    const newTab = createDefaultTab(`Tab ${nextIndex}`);
    updateProjectData((data) => ({
      ...data,
      tabs: [...(data.tabs ?? []), newTab],
      activeTabId: newTab.id
    }));
  };

  const deleteDiagramById = (diagramId: string) => {
    if (!project) return;
    const nextDiagrams = project.data.diagrams.filter((diagram) => diagram.id !== diagramId);
    const nextSelected =
      project.data.selectedDiagramId === diagramId
        ? nextDiagrams[0]?.id
        : project.data.selectedDiagramId;
    updateProjectData((data) => ({
      ...data,
      diagrams: data.diagrams.filter((diagram) => diagram.id !== diagramId),
      selectedDiagramId: nextSelected
    }));
    setSelectionTarget(nextSelected ? "diagram" : "tab");
  };

  const deleteTabById = (tabId: string) => {
    if (!project) return;
    if ((project.data.tabs?.length ?? 0) <= 1) return;
    updateProjectData((data) => {
      const currentTabs = data.tabs ?? [];
      if (currentTabs.length <= 1) return data;
      const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);
      if (nextTabs.length === 0) return data;
      const removedIndex = currentTabs.findIndex((tab) => tab.id === tabId);
      const fallbackTab = nextTabs[Math.max(0, removedIndex - 1)] ?? nextTabs[0];
      const nextActiveTabId =
        data.activeTabId && nextTabs.some((tab) => tab.id === data.activeTabId)
          ? data.activeTabId
          : fallbackTab.id;
      const nextDiagrams = data.diagrams.filter((diagram) => diagram.tabId !== tabId);
      const selectedStillValid = nextDiagrams.some(
        (diagram) => diagram.id === data.selectedDiagramId
      );
      const nextSelectedDiagramId = selectedStillValid
        ? data.selectedDiagramId
        : nextDiagrams.find((diagram) => diagram.tabId === nextActiveTabId)?.id ??
          nextDiagrams[0]?.id;
      return {
        ...data,
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
        diagrams: nextDiagrams,
        selectedDiagramId: nextSelectedDiagramId
      };
    });
    setSelectionTarget("tab");
  };

  const requestDelete = (action: DeleteAction | null) => {
    if (!action || deletePrompt) return;
    if (action.type === "tab" && (project?.data.tabs?.length ?? 0) <= 1) return;
    if (showDeleteWarning) {
      setDeletePrompt(action);
      setDeletePromptDontShow(false);
      return;
    }
    if (action.type === "diagram") {
      deleteDiagramById(action.id);
    } else {
      deleteTabById(action.id);
    }
  };

  const confirmDelete = () => {
    if (!deletePrompt) return;
    if (deletePromptDontShow) {
      setShowDeleteWarning(false);
    }
    if (deletePrompt.type === "diagram") {
      deleteDiagramById(deletePrompt.id);
    } else {
      deleteTabById(deletePrompt.id);
    }
    setDeletePrompt(null);
    setDeletePromptDontShow(false);
  };

  const cancelDelete = () => {
    setDeletePrompt(null);
    setDeletePromptDontShow(false);
  };

  useEffect(() => {
    requestDeleteRef.current = requestDelete;
  }, [requestDelete]);

  const moveDiagramToTab = (diagramId: string, tabId: string) => {
    const currentProject = projectRef.current;
    if (!currentProject) return;
    if (!currentProject.data.tabs?.some((tab) => tab.id === tabId)) return;
    setSelectionTarget("diagram");
    updateProjectData((data) => ({
      ...data,
      activeTabId: tabId,
      selectedDiagramId: diagramId,
      diagrams: data.diagrams.map((diagram) =>
        diagram.id === diagramId ? { ...diagram, tabId } : diagram
      )
    }));
  };

  const getTabDropTarget = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const tabButton = element?.closest("[data-tab-id]") as HTMLElement | null;
    return tabButton?.dataset.tabId ?? null;
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const closeImportMenu = () => setImportMenuOpen(false);
  const closeExportMenu = () => setExportMenuOpen(false);

  const exportSelectedDiagram = async (format: "png" | "pdf") => {
    if (!selectedDiagram) return;
    const svg = document.querySelector(
      `svg[data-diagram-id="${selectedDiagram.id}"]`
    ) as SVGSVGElement | null;
    if (!svg) {
      window.alert("Select a neck diagram to export.");
      return;
    }

    const theoryName = getDiagramTheoryName(selectedDiagram);
    const defaultBase =
      format === "pdf" && theoryName
        ? slugify(theoryName) || buildExportName(selectedDiagram)
        : buildExportName(selectedDiagram);
    const filename = requestExportName("Name this export", defaultBase);
    if (!filename) return;

    try {
      setExporting(true);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const { image, width, height } = await svgToImage(svg, selectedDiagram.name);
      const scale = format === "pdf" ? PDF_DPI / SCREEN_DPI : EXPORT_SCALE;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas rendering failed.");
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0);

      if (format === "png") {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) throw new Error("PNG export failed.");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const exportDate = new Date();
      const exportLabel = formatExportDate(exportDate);
      const headerHeight = EXPORT_CAPTION_HEIGHT;
      const pdfScale = PDF_DPI / SCREEN_DPI;
      const pdfW = Math.round(width * pdfScale);
      const pdfH = Math.round(height * pdfScale);
      const pdf = new jsPDF({
        orientation: width >= height ? "landscape" : "portrait",
        unit: "px",
        format: [pdfW, Math.round(pdfH + headerHeight)]
      });
      const pngData = canvas.toDataURL("image/png");
      pdf.setFontSize(12);
      pdf.setTextColor(120);
      pdf.text(exportLabel, 12, 18);
      pdf.addImage(pngData, "PNG", 0, headerHeight, pdfW, pdfH);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error(error);
      window.alert("Export failed. Try again or resize the diagram before exporting.");
    } finally {
      setExporting(false);
    }
  };

  const exportPagePdf = async () => {
    if (!project || !activeTabId) return;
    if (diagramsInActiveTab.length === 0) {
      window.alert("Add a neck diagram before exporting.");
      return;
    }

    const tabName = activeTab ? getTabDisplayName(activeTab, activeTabIndex) : "page";
    const defaultBase = slugify(`${project.title}-${tabName}`) || "page";
    const fileBase = requestExportName("Name this export", defaultBase);
    if (!fileBase) return;

    try {
      setExporting(true);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const exportDate = new Date();
      const exportLabel = formatExportDate(exportDate);
      const headerHeight = EXPORT_CAPTION_HEIGHT;
      const padding = 24;
      const images: Array<{
        diagram: NeckDiagram;
        image: HTMLImageElement;
        width: number;
        height: number;
      }> = [];

      for (const diagram of diagramsInActiveTab) {
        const svg = document.querySelector(
          `svg[data-diagram-id="${diagram.id}"]`
        ) as SVGSVGElement | null;
        if (!svg) continue;
        const { image, width, height } = await svgToImage(svg, diagram.name);
        images.push({ diagram, image, width, height });
      }

      if (images.length === 0) {
        window.alert("No diagrams found to export.");
        return;
      }

      const minX = Math.min(...images.map((item) => item.diagram.x));
      const minY = Math.min(...images.map((item) => item.diagram.y));
      const maxX = Math.max(
        ...images.map((item) => item.diagram.x + item.width)
      );
      const maxY = Math.max(
        ...images.map((item) => item.diagram.y + item.height)
      );
      const width = Math.max(1, Math.round(maxX - minX + padding * 2));
      const height = Math.max(1, Math.round(maxY - minY + padding * 2));
      const pdfScale = PDF_DPI / SCREEN_DPI;
      const pdfW = Math.round(width * pdfScale);
      const pdfH = Math.round(height * pdfScale);

      const canvas = document.createElement("canvas");
      canvas.width = pdfW;
      canvas.height = pdfH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas rendering failed.");
      ctx.setTransform(pdfScale, 0, 0, pdfScale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const pageBg = getCssVar("--bg", "#0b1015");
      ctx.fillStyle = pageBg;
      ctx.fillRect(0, 0, width, height);

      images.forEach((item) => {
        const x = item.diagram.x - minX + padding;
        const y = item.diagram.y - minY + padding;
        ctx.drawImage(item.image, x, y);
      });

      const pngData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: width >= height ? "landscape" : "portrait",
        unit: "px",
        format: [pdfW, Math.round(pdfH + headerHeight)]
      });
      pdf.setFontSize(12);
      pdf.setTextColor(120);
      pdf.text(exportLabel, 12, 18);
      pdf.addImage(pngData, "PNG", 0, headerHeight, pdfW, pdfH);

      pdf.save(`${fileBase}.pdf`);
    } catch (error) {
      console.error(error);
      window.alert("Export failed. Try again or resize the diagrams before exporting.");
    } finally {
      setExporting(false);
    }
  };

  const exportPagePng = async () => {
    if (!project || !activeTabId) return;
    if (diagramsInActiveTab.length === 0) {
      window.alert("Add a neck diagram before exporting.");
      return;
    }

    const tabName = activeTab ? getTabDisplayName(activeTab, activeTabIndex) : "page";
    const defaultBase = slugify(`${project.title}-${tabName}`) || "page";
    const fileBase = requestExportName("Name this export", defaultBase);
    if (!fileBase) return;

    try {
      setExporting(true);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const padding = 24;
      const images: Array<{
        diagram: NeckDiagram;
        image: HTMLImageElement;
        width: number;
        height: number;
      }> = [];

      for (const diagram of diagramsInActiveTab) {
        const svg = document.querySelector(
          `svg[data-diagram-id="${diagram.id}"]`
        ) as SVGSVGElement | null;
        if (!svg) continue;
        const { image, width, height } = await svgToImage(svg, diagram.name);
        images.push({ diagram, image, width, height });
      }

      if (images.length === 0) {
        window.alert("No diagrams found to export.");
        return;
      }

      const minX = Math.min(...images.map((item) => item.diagram.x));
      const minY = Math.min(...images.map((item) => item.diagram.y));
      const maxX = Math.max(
        ...images.map((item) => item.diagram.x + item.width)
      );
      const maxY = Math.max(
        ...images.map((item) => item.diagram.y + item.height)
      );
      const width = Math.max(1, Math.round(maxX - minX + padding * 2));
      const height = Math.max(1, Math.round(maxY - minY + padding * 2));

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * EXPORT_SCALE);
      canvas.height = Math.round(height * EXPORT_SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas rendering failed.");
      ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const pageBg = getCssVar("--bg", "#0b1015");
      ctx.fillStyle = pageBg;
      ctx.fillRect(0, 0, width, height);

      images.forEach((item) => {
        const x = item.diagram.x - minX + padding;
        const y = item.diagram.y - minY + padding;
        ctx.drawImage(item.image, x, y);
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("PNG export failed.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileBase}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      window.alert("Export failed. Try again or resize the diagrams before exporting.");
    } finally {
      setExporting(false);
    }
  };

  const handleTitleChange = (value: string) => {
    setTitleInput(value);
    const nextTitle = value.trim().length > 0 ? value : DEFAULT_PROJECT_TITLE;
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        title: nextTitle,
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleConfigChange = (patch: Partial<NeckDiagram["config"]>) => {
    if (!selectedDiagram) return;
    updateDiagram(selectedDiagram.id, (diagram) => {
      const hasStrings = Object.prototype.hasOwnProperty.call(patch, "strings");
      const hasFrets = Object.prototype.hasOwnProperty.call(patch, "frets");
      const nextStrings = hasStrings ? patch.strings ?? diagram.config.strings : diagram.config.strings;
      const nextFrets = hasFrets ? patch.frets ?? diagram.config.frets : diagram.config.frets;
      const nextTuning = patch.tuning
        ? normalizeTuning(nextStrings, patch.tuning)
        : normalizeTuning(nextStrings, diagram.config.tuning);
      const nextNotes =
        hasStrings || hasFrets
          ? clampNotesToConfig(diagram.notes, nextStrings, nextFrets)
          : diagram.notes;
      return {
        ...diagram,
        notes: nextNotes,
        config: {
          ...diagram.config,
          ...patch,
          frets: nextFrets,
          strings: nextStrings,
          tuning: nextTuning
        }
      };
    });
  };

  const handleLibrarySelect = (item: LibraryItem) => {
    const nextIndex = { ...libraryIndex, [item.id]: item };
    setLibraryIndex(nextIndex);

    if (item.type === "key") {
      updateTheorySelection({ keyId: item.id }, nextIndex);
    }

    if (item.type === "scale" || item.type === "mode") {
      updateTheorySelection({ scaleId: item.id }, nextIndex);
    }

    if (item.type === "position") {
      updateTheorySelection({ positionId: item.id }, nextIndex);
    }
  };

  const statusMessage = useMemo(() => {
    if (status === "loading") return "Loading last project...";
    if (!project) return "Starting blank project...";
    if (project.data.diagrams.length === 0) return "Click + to add your first neck.";
    if (diagramsInActiveTab.length === 0) return "This tab is empty. Add a neck.";
    return null;
  }, [status, project, diagramsInActiveTab.length]);
  const isEmptyProject = !!project && project.data.diagrams.length === 0;
  if (status === "loading") {
    return (
      <div className="app loading">
        <div className="loading-card">Loading Neck Diagram Studio...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="title-group">
          <input
            className="title-input"
            value={project ? titleInput : ""}
            onChange={(event) => handleTitleChange(event.target.value)}
          />
          <span className="title-sub">
            <a href="https://iconoclastaud.io/" target="_blank" rel="noreferrer">
              Iconoclast Aud.io
            </a>
            <span> // Neck Diagram Studio</span>
          </span>
        </div>
      </header>

      <div className="toolbar">
        <div className="toolbar-tabs">
          <button
            className={`sidebar-toggle${sidebarCollapsed ? " is-collapsed" : ""}`}
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            <span className="nf-icon" aria-hidden="true">
              {ICONS.chevron}
            </span>
          </button>
          {tabs.length > 1 ? (
            <div className="tabs-list" role="tablist" aria-label="Diagram tabs">
              {tabs.map((tab, index) => {
                const displayName = getTabDisplayName(tab, index);
                return (
                <div key={tab.id} className="tab-item" data-tab-id={tab.id}>
                  <button
                    className={`tab-button${tab.id === activeTabId ? " is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTabId}
                    onClick={() => handleTabSelect(tab.id)}
                  >
                    {displayName}
                  </button>
                  <button
                    className="tab-close"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      requestDelete({ type: "tab", id: tab.id });
                    }}
                    aria-label={`Close ${displayName}`}
                    title={`Close ${displayName}`}
                  >
                    <span className="nf-icon" aria-hidden="true">
                      {"\uf00d"}
                    </span>
                  </button>
                </div>
              );
              })}
            </div>
          ) : null}
          <button className="tab-add" type="button" onClick={handleAddTab}>
            <span className="nf-icon" aria-hidden="true">
              {ICONS.add}
            </span>
            <span>New Tab</span>
          </button>
        </div>
        <button className="tool-button accent" onClick={handleAddDiagram}>
          <span className="nf-icon" aria-hidden="true">
            {ICONS.add}
          </span>
          <span>Add Neck</span>
        </button>
        <div className="tool-group">
          <button
            className="tool-button"
            type="button"
            onClick={() => adjustZoom(-ZOOM_STEP)}
            disabled={canvasZoom <= MIN_ZOOM}
          >
            <span>-</span>
          </button>
          <button className="tool-button" type="button" onClick={resetZoom}>
            {Math.round(canvasZoom * 100)}%
          </button>
          <button
            className="tool-button"
            type="button"
            onClick={() => adjustZoom(ZOOM_STEP)}
            disabled={canvasZoom >= MAX_ZOOM}
          >
            <span>+</span>
          </button>
        </div>
        <div className="tool-group">
          <div className={`dropdown${importMenuOpen ? " is-open" : ""}`} ref={importMenuRef}>
            <button
              className="tool-button"
              type="button"
              onClick={() => {
                setImportMenuOpen((prev) => !prev);
                setExportMenuOpen(false);
              }}
              aria-expanded={importMenuOpen}
              aria-haspopup="menu"
            >
              <span className="nf-icon" aria-hidden="true">
                {ICONS.upload}
              </span>
              <span>Import</span>
              <span className="nf-icon" aria-hidden="true">
                {ICONS.chevron}
              </span>
            </button>
            {importMenuOpen ? (
              <div className="dropdown-menu" role="menu">
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    handleImportClick("diagram");
                    closeImportMenu();
                  }}
                >
                  <span className="nf-icon" aria-hidden="true">
                    {ICONS.json}
                  </span>
                  <span>Import Diagram JSON</span>
                </button>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    handleImportClick("page");
                    closeImportMenu();
                  }}
                >
                  <span className="nf-icon" aria-hidden="true">
                    {ICONS.upload}
                  </span>
                  <span>Import Page JSON</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="tool-group">
          <div className={`dropdown${exportMenuOpen ? " is-open" : ""}`} ref={exportMenuRef}>
            <button
              className="tool-button"
              type="button"
              onClick={() => {
                setExportMenuOpen((prev) => !prev);
                setImportMenuOpen(false);
              }}
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
            >
              <span className="nf-icon" aria-hidden="true">
                {ICONS.export}
              </span>
              <span>Export</span>
              <span className="nf-icon" aria-hidden="true">
                {ICONS.chevron}
              </span>
            </button>
            {exportMenuOpen ? (
              <div className="dropdown-menu" role="menu">
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    exportSelectedDiagram("png");
                    closeExportMenu();
                  }}
                  disabled={!selectedDiagram || exporting}
                  title={selectedDiagram ? "Export selected neck as PNG" : "Select a neck to export"}
                >
                  <span className="nf-icon" aria-hidden="true">
                    {ICONS.png}
                  </span>
                  <span>Export Diagram PNG</span>
                </button>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    exportSelectedDiagramJson();
                    closeExportMenu();
                  }}
                  disabled={!selectedDiagram || exporting}
                  title={selectedDiagram ? "Export selected neck as JSON" : "Select a neck to export"}
                >
                  <span className="nf-icon" aria-hidden="true">
                    {ICONS.json}
                  </span>
                  <span>Export Diagram JSON</span>
                </button>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    exportPagePdf();
                    closeExportMenu();
                  }}
                  disabled={!diagramsInActiveTab.length || exporting}
                  title={
                    diagramsInActiveTab.length
                      ? "Export current page to PDF"
                      : "Add a neck to export"
                  }
                >
                  <span className="nf-icon" aria-hidden="true">
                    {ICONS.pdf}
                  </span>
                  <span>Export Page PDF</span>
                </button>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    exportPagePng();
                    closeExportMenu();
                  }}
                  disabled={!diagramsInActiveTab.length || exporting}
                  title={
                    diagramsInActiveTab.length
                      ? "Export current page to PNG"
                      : "Add a neck to export"
                  }
                >
                  <span className="nf-icon" aria-hidden="true">
                    {ICONS.png}
                  </span>
                  <span>Export Page PNG</span>
                </button>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    exportPageJson();
                    closeExportMenu();
                  }}
                  disabled={!diagramsInActiveTab.length || exporting}
                  title={
                    diagramsInActiveTab.length
                      ? "Export current page as JSON"
                      : "Add a neck to export"
                  }
                >
                  <span className="nf-icon" aria-hidden="true">
                    {ICONS.json}
                  </span>
                  <span>Export Page JSON</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="toolbar-right">
          <div className="tool-hint">
            Hold Cmd/Ctrl and drag to move. Hold Alt to resize, Alt+Shift to scale. Press Cmd/Ctrl + / to toggle the
            sidebar.
          </div>
        </div>
      </div>

      <div className="workspace">
        <input
          ref={importInputRef}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={handleImportChange}
          aria-hidden="true"
          tabIndex={-1}
        />
        <aside
          className={`sidebar${sidebarCollapsed ? " is-collapsed" : ""}${
            isSidebarCompact ? " is-compact" : ""
          }`}
          aria-hidden={sidebarCollapsed}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        >
          <section className="panel">
            <div
              className="panel-header"
              onClick={() => openPanelFromCompact("worksheets")}
              role={isSidebarCompact ? "button" : undefined}
              tabIndex={isSidebarCompact ? 0 : undefined}
            >
              <h3 title="Worksheets">
                <span className="panel-icon nf-icon" aria-hidden="true">
                  {ICONS.worksheets}
                </span>
                <span className="panel-title">Worksheets</span>
              </h3>
              <button
                className="panel-toggle"
                type="button"
                onClick={() => togglePanel("worksheets")}
                aria-expanded={panelOpen.worksheets}
                aria-label={panelOpen.worksheets ? "Collapse Worksheets" : "Expand Worksheets"}
              >
                <span className="nf-icon" aria-hidden="true">
                  {ICONS.chevron}
                </span>
              </button>
            </div>
            <div className={`panel-body${panelOpen.worksheets ? "" : " is-collapsed"}`}>
              <div className="worksheet-controls">
                <p className="muted" style={{ marginBottom: 8, fontSize: "13px" }}>
                  Load a bundled worksheet or paste JSON.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                      Bundled worksheets
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          handleLoadBundledWorksheet("/worksheets/shape-sharing-modes-6string.json")
                        }
                      >
                        Shape sharing (6-string)
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          handleLoadBundledWorksheet(
                            "/worksheets/8string-major-minor-sweep-arpeggios.json"
                          )
                        }
                      >
                        8-string sweep arpeggios
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          handleLoadBundledWorksheet(
                            "/worksheets/8string-root-A-harmonic-minor-modes.json"
                          )
                        }
                      >
                        A Harmonic Minor &amp; modes
                      </button>
                    </div>
                  </div>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                    Paste worksheet JSON
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder='{"title": "...", "items": [{"name": "..."}]}'
                    value={worksheetPasteInput}
                    onChange={(e) => setWorksheetPasteInput(e.target.value)}
                    style={{ width: "100%", resize: "vertical", fontFamily: "monospace" }}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => setWorksheetFromJson(worksheetPasteInput)}
                    >
                      Set as current worksheet
                    </button>
                    <label style={{ display: "flex", alignItems: "center" }}>
                      <input
                        ref={worksheetFileInputRef}
                        type="file"
                        accept=".json,application/json"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const text = reader.result;
                            if (typeof text === "string") setWorksheetFromJson(text);
                          };
                          reader.readAsText(file);
                          e.target.value = "";
                        }}
                      />
                      <span
                        role="button"
                        tabIndex={0}
                        className="button button-secondary"
                        onClick={() => worksheetFileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            worksheetFileInputRef.current?.click();
                          }
                        }}
                      >
                        Load JSON file
                      </span>
                    </label>
                  </div>
                </div>
                {worksheetError && (
                  <p className="muted" style={{ marginTop: 8, color: "var(--note-root)", fontSize: 12 }}>
                    {worksheetError}
                  </p>
                )}
                {currentWorksheet && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                      {currentWorksheet.title}
                    </p>
                    {currentWorksheet.sourceRef && (
                      <p className="muted" style={{ margin: "2px 0 0", fontSize: 11 }}>
                        {currentWorksheet.sourceRef}
                      </p>
                    )}
                    <ul
                      style={{
                        margin: "8px 0 0",
                        paddingLeft: 18,
                        fontSize: 12,
                        maxHeight: 120,
                        overflowY: "auto"
                      }}
                    >
                      {currentWorksheet.items.map((item, i) => (
                        <li key={`${item.name}-${i}`}>{item.name}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="button button-primary"
                      style={{ marginTop: 10, width: "100%" }}
                      onClick={handleRenderWorksheetToCanvas}
                    >
                      Render diagrams on canvas
                    </button>
                  </div>
                )}
                {!currentWorksheet && !worksheetError && (
                  <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                    Load or paste a worksheet to see items and render.
                  </p>
                )}
              </div>
            </div>
          </section>
          <section className="panel">
            <div
              className="panel-header"
              onClick={() => openPanelFromCompact("theory")}
              role={isSidebarCompact ? "button" : undefined}
              tabIndex={isSidebarCompact ? 0 : undefined}
            >
              <h3 title="Theory">
                <span className="panel-icon nf-icon" aria-hidden="true">
                  {ICONS.theory}
                </span>
                <span className="panel-title">Theory</span>
              </h3>
              <button
                className="panel-toggle"
                type="button"
                onClick={() => togglePanel("theory")}
                aria-expanded={panelOpen.theory}
                aria-label={panelOpen.theory ? "Collapse Theory" : "Expand Theory"}
              >
                <span className="nf-icon" aria-hidden="true">
                  {ICONS.chevron}
                </span>
              </button>
            </div>
            <div className={`panel-body${panelOpen.theory ? "" : " is-collapsed"}`}>
              <label>
                Key
                <select
                  value={project?.data.keyId ?? ""}
                  onChange={(event) => {
                    const nextId = event.target.value || undefined;
                    const nextItem = nextId
                      ? keyOptions.find((item) => item.id === nextId)
                      : undefined;
                    if (nextItem) {
                      const nextIndex = { ...libraryIndex, [nextItem.id]: nextItem };
                      setLibraryIndex(nextIndex);
                      updateTheorySelection({ keyId: nextId }, nextIndex);
                      return;
                    }
                    updateTheorySelection({ keyId: nextId });
                  }}
                >
                  <option value="">Select Key</option>
                  {keyOptions.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scale/Mode
                <select
                  value={project?.data.scaleId ?? ""}
                  onChange={(event) => {
                    const nextId = event.target.value || undefined;
                    const nextItem = nextId
                      ? scaleOptions.find((item) => item.id === nextId)
                      : undefined;
                    if (nextItem) {
                      const nextIndex = { ...libraryIndex, [nextItem.id]: nextItem };
                      setLibraryIndex(nextIndex);
                      updateTheorySelection({ scaleId: nextId }, nextIndex);
                      return;
                    }
                    updateTheorySelection({ scaleId: nextId });
                  }}
                >
                  <option value="">Select Scale</option>
                  {scaleOptions.map((scale) => (
                    <option key={scale.id} value={scale.id}>
                      {scale.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Position
                <select
                  value={project?.data.positionId ?? ""}
                  onChange={(event) => {
                    const nextId = event.target.value || undefined;
                    const nextItem = nextId
                      ? positionOptions.find((item) => item.id === nextId)
                      : undefined;
                    if (nextItem) {
                      const nextIndex = { ...libraryIndex, [nextItem.id]: nextItem };
                      setLibraryIndex(nextIndex);
                      updateTheorySelection({ positionId: nextId }, nextIndex);
                      return;
                    }
                    updateTheorySelection({ positionId: nextId });
                  }}
                >
                  <option value="">Select Position</option>
                  {positionOptions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="tool-button accent"
                type="button"
                onClick={() => handleAddDiagramFromTheory(selectedDiagram?.id)}
                disabled={!project}
              >
                <span className="nf-icon" aria-hidden="true">
                  {ICONS.add}
                </span>
                <span>{selectedDiagram ? "Replace Diagram" : "Create Diagram"}</span>
              </button>
              <div className="panel-subhead">Library Search</div>
              <div className="library-controls">
                <input
                  placeholder="Search scales, modes, positions..."
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                />
                <select value={libraryType} onChange={(event) => setLibraryType(event.target.value)}>
                  <option value="all">All Types</option>
                  <option value="scale">Scales</option>
                  <option value="mode">Modes</option>
                  <option value="position">Positions</option>
                  <option value="key">Keys</option>
                </select>
              </div>
              <div className="library-results">
                {libraryResults.length === 0 ? (
                  <p className="muted">Type to search the library.</p>
                ) : (
                  libraryResults.map((item) => (
                    <button
                      key={item.id}
                      className="library-item"
                      onClick={() => handleLibrarySelect(item)}
                    >
                      <span>{item.name}</span>
                      <span className="tag">{item.type}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="panel">
            <div
              className="panel-header"
              onClick={() => openPanelFromCompact("diagram")}
              role={isSidebarCompact ? "button" : undefined}
              tabIndex={isSidebarCompact ? 0 : undefined}
            >
              <h3 title="Diagram">
                <span className="panel-icon nf-icon" aria-hidden="true">
                  {ICONS.diagram}
                </span>
                <span className="panel-title">Diagram</span>
              </h3>
              <button
                className="panel-toggle"
                type="button"
                onClick={() => togglePanel("diagram")}
                aria-expanded={panelOpen.diagram}
                aria-label={panelOpen.diagram ? "Collapse Diagram" : "Expand Diagram"}
              >
                <span className="nf-icon" aria-hidden="true">
                  {ICONS.chevron}
                </span>
              </button>
            </div>
            <div className={`panel-body${panelOpen.diagram ? "" : " is-collapsed"}`}>
              {selectedDiagram ? (
                <div className="form-grid">
                  <label>
                    Name
                    <input
                      value={selectedDiagram.name}
                      onChange={(event) =>
                        updateDiagram(selectedDiagram.id, (diagram) => ({
                          ...diagram,
                          name: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label>
                    Layout
                    <select
                      value={selectedDiagram.layoutMode ?? "grid"}
                      onChange={(event) => {
                        const nextMode = event.target.value === "float" ? "float" : "grid";
                        if (nextMode === "float") {
                          updateDiagram(selectedDiagram.id, (diagram) => ({
                            ...diagram,
                            layoutMode: "float"
                          }));
                          return;
                        }
                        const gridDiagrams = diagramsInActiveTab.filter(
                          (diagram) => diagram.id !== selectedDiagram.id && isGridDiagram(diagram)
                        );
                        const gridForTile = gridDiagrams.map(toTilingDiagram);
                        const position = suggestTile(
                          gridForTile,
                          canvasSize,
                          { width: selectedDiagram.width, height: getDiagramExportHeight(selectedDiagram) },
                          TILE_GAP
                        );
                        updateDiagram(selectedDiagram.id, (diagram) => ({
                          ...diagram,
                          layoutMode: "grid",
                          x: position.x,
                          y: position.y
                        }));
                      }}
                    >
                      <option value="float">Floating</option>
                      <option value="grid">Grid</option>
                    </select>
                  </label>
                  <label>
                    Key
                    <select
                      value={selectedDiagram.keyId ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value || undefined;
                        const nextItem = nextId
                          ? keyOptions.find((item) => item.id === nextId)
                          : undefined;
                        const nextIndex = nextItem
                          ? { ...libraryIndex, [nextItem.id]: nextItem }
                          : libraryIndex;
                        if (nextItem) {
                          setLibraryIndex(nextIndex);
                        }
                        updateDiagram(selectedDiagram.id, (diagram) => {
                          const updated = { ...diagram, keyId: nextId };
                          return {
                            ...updated,
                            notes: buildDiagramNotes(
                              updated,
                              nextId,
                              updated.scaleId,
                              updated.positionId,
                              nextIndex
                            )
                          };
                        });
                      }}
                    >
                      <option value="">Select Key</option>
                      {keyOptions.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Scale/Mode
                    <select
                      value={selectedDiagram.scaleId ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value || undefined;
                        const nextItem = nextId
                          ? scaleOptions.find((item) => item.id === nextId)
                          : undefined;
                        const nextIndex = nextItem
                          ? { ...libraryIndex, [nextItem.id]: nextItem }
                          : libraryIndex;
                        if (nextItem) {
                          setLibraryIndex(nextIndex);
                        }
                        updateDiagram(selectedDiagram.id, (diagram) => {
                          const updated = { ...diagram, scaleId: nextId };
                          return {
                            ...updated,
                            notes: buildDiagramNotes(
                              updated,
                              updated.keyId,
                              nextId,
                              updated.positionId,
                              nextIndex
                            )
                          };
                        });
                      }}
                    >
                      <option value="">Select Scale</option>
                      {scaleOptions.map((scale) => (
                        <option key={scale.id} value={scale.id}>
                          {scale.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Position
                    <select
                      value={selectedDiagram.positionId ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value || undefined;
                        const nextItem = nextId
                          ? positionOptions.find((item) => item.id === nextId)
                          : undefined;
                        const nextIndex = nextItem
                          ? { ...libraryIndex, [nextItem.id]: nextItem }
                          : libraryIndex;
                        if (nextItem) {
                          setLibraryIndex(nextIndex);
                        }
                        updateDiagram(selectedDiagram.id, (diagram) => {
                          const updated = { ...diagram, positionId: nextId };
                          return {
                            ...updated,
                            notes: buildDiagramNotes(
                              updated,
                              updated.keyId,
                              updated.scaleId,
                              nextId,
                              nextIndex
                            )
                          };
                        });
                      }}
                    >
                      <option value="">Select Position</option>
                      {positionOptions.map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="full">
                    Mode
                    <select
                      value={selectedDiagram.labelMode ?? defaultLabelMode}
                      onChange={(event) => {
                        const nextMode = event.target.value as LabelMode;
                        handleLabelModeChange(nextMode);
                      }}
                    >
                      <option value="key">Key</option>
                      <option value="interval">Interval</option>
                      <option value="picking">Picking</option>
                    </select>
                  </label>
                  <label>
                    Frets
                    <input
                      type="number"
                      min={4}
                      max={27}
                      value={selectedDiagram.config.frets}
                      onChange={(event) =>
                        handleConfigChange({ frets: Number(event.target.value) || 12 })
                      }
                    />
                  </label>
                  <label className="checkbox full">
                    <span>Highlight Root Note</span>
                    <input
                      type="checkbox"
                      checked={selectedDiagram.config.highlightRoot ?? true}
                      onChange={(event) =>
                        handleConfigChange({ highlightRoot: event.target.checked })
                      }
                    />
                  </label>
                  <label className="checkbox full">
                    <span>Show Fret Numbers</span>
                    <input
                      type="checkbox"
                      checked={selectedDiagram.config.showFretNumbers ?? false}
                      onChange={(event) =>
                        handleConfigChange({ showFretNumbers: event.target.checked })
                      }
                    />
                  </label>
                  <label>
                    Capo
                    <input
                      type="number"
                      min={0}
                      max={selectedDiagram.config.frets - 1}
                      value={selectedDiagram.config.capo}
                      onChange={(event) =>
                        handleConfigChange({ capo: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                </div>
              ) : (
                <p className="muted">Select a neck to edit its configuration.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div
              className="panel-header"
              onClick={() => openPanelFromCompact("instrument")}
              role={isSidebarCompact ? "button" : undefined}
              tabIndex={isSidebarCompact ? 0 : undefined}
            >
              <h3 title="Instrument">
                <span className="panel-icon nf-icon" aria-hidden="true">
                  {ICONS.instrument}
                </span>
                <span className="panel-title">Instrument</span>
              </h3>
              <button
                className="panel-toggle"
                type="button"
                onClick={() => togglePanel("instrument")}
                aria-expanded={panelOpen.instrument}
                aria-label={panelOpen.instrument ? "Collapse Instrument" : "Expand Instrument"}
              >
                <span className="nf-icon" aria-hidden="true">
                  {ICONS.chevron}
                </span>
              </button>
            </div>
            <div className={`panel-body${panelOpen.instrument ? "" : " is-collapsed"}`}>
              {selectedDiagram ? (
                <div className="form-grid">
                  <label>
                    Strings
                    <input
                      type="number"
                      min={3}
                      max={10}
                      value={selectedDiagram.config.strings}
                      onChange={(event) =>
                        handleConfigChange({ strings: Number(event.target.value) || 6 })
                      }
                    />
                  </label>
                  <label className="full">
                    Tuning (comma-separated)
                    <input
                      value={selectedDiagram.config.tuning.join(", ")}
                      onChange={(event) =>
                        handleConfigChange({
                          tuning: event.target.value.split(",").map((note) => note.trim())
                        })
                      }
                    />
                  </label>
                  {selectedDiagram.config.strings === 8 ? (
                    <div className="tuning-presets full">
                      <span>8-String Presets</span>
                      <div className="preset-buttons">
                        {EIGHT_STRING_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            className="preset-button"
                            type="button"
                            onClick={() => handleConfigChange({ tuning: [...preset.tuning] })}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="muted">Select a neck to edit its configuration.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div
              className="panel-header"
              onClick={() => openPanelFromCompact("settings")}
              role={isSidebarCompact ? "button" : undefined}
              tabIndex={isSidebarCompact ? 0 : undefined}
            >
              <h3 title="Settings">
                <span className="panel-icon nf-icon" aria-hidden="true">
                  {ICONS.settings}
                </span>
                <span className="panel-title">Settings</span>
              </h3>
              <button
                className="panel-toggle"
                type="button"
                onClick={() => togglePanel("settings")}
                aria-expanded={panelOpen.settings}
                aria-label={panelOpen.settings ? "Collapse Settings" : "Expand Settings"}
              >
                <span className="nf-icon" aria-hidden="true">
                  {ICONS.chevron}
                </span>
              </button>
            </div>
            <div className={`panel-body${panelOpen.settings ? "" : " is-collapsed"}`}>
              {selectedDiagram ? (
                <div className="form-grid">
                  <label>
                    Note Display
                    <select
                      value={selectedDiagram.config.displayStandardTuning ? "standard" : "tuning"}
                      onChange={(event) => {
                        const displayStandardTuning = event.target.value === "standard";
                        updateProjectData((data) => ({
                          ...data,
                          diagrams: data.diagrams.map((diagram) => {
                            if (activeTabId && diagram.tabId !== activeTabId) return diagram;
                            return {
                              ...diagram,
                              config: { ...diagram.config, displayStandardTuning }
                            };
                          })
                        }));
                      }}
                    >
                      <option value="tuning">Transpose to tuning</option>
                      <option value="standard">Standard tuning</option>
                    </select>
                  </label>
                  <label>
                    Fret Numbers
                    <select
                      value={selectedDiagram.config.fretNumberStyle ?? "arabic"}
                      onChange={(event) =>
                        handleConfigChange({
                          fretNumberStyle: event.target.value === "roman" ? "roman" : "arabic"
                        })
                      }
                    >
                      <option value="arabic">Arabic</option>
                      <option value="roman">Roman</option>
                    </select>
                  </label>
                  <label className="checkbox full">
                    <span>Snap to Grid</span>
                    <input
                      type="checkbox"
                      checked={selectedDiagram.config.snapToGrid ?? false}
                      onChange={(event) =>
                        handleConfigChange({ snapToGrid: event.target.checked })
                      }
                    />
                  </label>
                  <label className="checkbox full">
                    <span>Show Inlays</span>
                    <input
                      type="checkbox"
                      checked={selectedDiagram.config.showInlays ?? true}
                      onChange={(event) =>
                        handleConfigChange({ showInlays: event.target.checked })
                      }
                    />
                  </label>
                </div>
              ) : (
                <p className="muted">Select a neck to edit its configuration.</p>
              )}
              <div className="panel-subhead">Appearance</div>
              <div className="theme-grid grid grid-cols-2 gap-2">
                {THEMES.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    type="button"
                    className={`theme-option${theme === themeOption.id ? " is-active" : ""}`}
                    onClick={() => setTheme(themeOption.id)}
                    aria-pressed={theme === themeOption.id}
                  >
                    <span
                      className="theme-swatch"
                      style={{ background: themeOption.preview }}
                      aria-hidden="true"
                    />
                    <span>{themeOption.label}</span>
                  </button>
                ))}
              </div>
              <div className="panel-subhead">Preferences</div>
              <div className="form-grid">
                <label className="checkbox full">
                  <span>Delete Warning</span>
                  <input
                    type="checkbox"
                    checked={showDeleteWarning}
                    onChange={(event) => setShowDeleteWarning(event.target.checked)}
                  />
                </label>
                <label className="checkbox full">
                  <span>Show Page Date</span>
                  <input
                    type="checkbox"
                    checked={showPageDate}
                    onChange={(event) => setShowPageDate(event.target.checked)}
                  />
                </label>
              </div>
            </div>
          </section>

          <div
            className={`sidebar-resizer${resizingSidebar ? " is-active" : ""}`}
            onPointerDown={() => setResizingSidebar(true)}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
          />
        </aside>

        <main className="canvas" onPointerDown={handleCanvasPointerDown}>
          {selectedDiagram ? (
            <div className="canvas-overlay" aria-hidden="true">
              <div className="trash-zone is-visible" ref={trashRef}>
                <span className="nf-icon" aria-hidden="true">
                  {ICONS.trash}
                </span>
                <span>Trash</span>
              </div>
            </div>
          ) : null}
          <div
            className="canvas-surface"
            ref={canvasRef}
            style={{ backgroundSize: `${GRID_SIZE * canvasZoom}px ${GRID_SIZE * canvasZoom}px` }}
          >
            <div className="canvas-zoom" style={{ zoom: canvasZoom }}>
              {sidebarCollapsed && (outlineLocked ?? outlineMetrics) ? (
                <div
                  className="page-frame"
                  style={{
                    width: (outlineLocked ?? outlineMetrics)!.width,
                    height: (outlineLocked ?? outlineMetrics)!.height,
                    left: (outlineLocked ?? outlineMetrics)!.left,
                    top: (outlineLocked ?? outlineMetrics)!.top
                  }}
                >
                  <div className="page-outline" />
                  {(hasCustomTabTitle || showPageDate) ? (
                    <div className="page-header">
                      {hasCustomTabTitle ? (
                        <div className="page-title">{activeTabName}</div>
                      ) : null}
                      {showPageDate ? (
                        <div className="page-date">{formatExportDate(new Date())}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {diagramsInActiveTab.map((diagram) => {
                const diagramKey = diagram.keyId ? libraryIndex[diagram.keyId] : undefined;
                const diagramScale = diagram.scaleId ? libraryIndex[diagram.scaleId] : undefined;
                const offsetX = sidebarCollapsed ? sidebarOffset : 0;
                const isDraggingDiagram = draggingDiagramId === diagram.id;
                const isTrashHover = trashHoverDiagramId === diagram.id;
                return (
                  <div
                    key={diagram.id}
                    className={`diagram-wrapper${isDraggingDiagram ? " is-dragging" : ""}${
                      isTrashHover ? " is-trash-hover" : ""
                    }`}
                    data-diagram-wrapper={diagram.id}
                    style={{ left: diagram.x + offsetX, top: diagram.y }}
                  >
                  <NeckDiagramView
                    diagram={diagram}
                    selected={selectedDiagram?.id === diagram.id}
                    rootKey={diagramKey?.name}
                    scaleIntervals={diagramScale?.intervals ?? null}
                    zoom={canvasZoom}
                    onPointerDown={(event) => handleDiagramPointerDown(event, diagram)}
                    onToggleNote={(stringIndex, fret) =>
                      handleToggleNote(diagram.id, stringIndex, fret)
                    }
                    isRenaming={renamingDiagramId === diagram.id}
                    renameDraft={renamingDiagramId === diagram.id ? renameDraft : ""}
                    onRenameStart={() => beginRename(diagram)}
                    onRenameDraftChange={setRenameDraft}
                    onRenameCommit={() => commitRename(diagram.id, renameDraft)}
                    onRenameCancel={cancelRename}
                  />
                  </div>
              );
              })}
            </div>
            {statusMessage && (
              <div className={`canvas-hint${isEmptyProject ? " is-centered" : ""}`}>
                {statusMessage}
              </div>
            )}
          </div>
        </main>
      </div>
      {deletePrompt ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h4>
              Delete {deletePrompt.type === "diagram" ? "Diagram" : "Tab"}?
            </h4>
            <p className="muted">
              This will permanently delete the selected {deletePrompt.type === "diagram" ? "diagram" : "tab"}.
            </p>
            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={deletePromptDontShow}
                onChange={(event) => setDeletePromptDontShow(event.target.checked)}
              />
              <span>Don&apos;t show again</span>
            </label>
            <div className="modal-actions">
              <button className="tool-button" type="button" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="tool-button danger" type="button" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default App;
