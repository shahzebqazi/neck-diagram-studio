import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { jsPDF } from "jspdf";
import type {
  LibraryItem,
  LabelMode,
  NeckDiagram,
  Note,
  ProjectData,
  ProjectRecord,
  ProjectTab
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
import { DEFAULT_KEYS, DEFAULT_MODES, DEFAULT_POSITIONS, DEFAULT_SCALES } from "./lib/libraryDefaults";
import { getNoteIndex, noteNameToIndex } from "./lib/neckMath";

const MIN_WIDTH = 260;
const MIN_HEIGHT = 90;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 400;
const EXPORT_SCALE = 2;
const EXPORT_CAPTION_HEIGHT = 28;
const DEFAULT_PROJECT_TITLE = "Untitled Neck Diagram";
const DEMO_PROJECT_TITLE = "Demo Session";
const GRID_SIZE = 32;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const US_LETTER_SIZE = { width: 816, height: 1056 };
const OUTLINE_PADDING = 32;
const TILE_GAP = 24;
const MIN_SIDEBAR_WIDTH = 120;
const MAX_SIDEBAR_WIDTH = 480;
const SIDEBAR_STATE_STORAGE_KEY = "neck-diagram:sidebar-collapsed";
const PAGE_DATE_STORAGE_KEY = "neck-diagram:page-date";
const DELETE_WARNING_STORAGE_KEY = "neck-diagram:delete-warning";
const THEME_STORAGE_KEY = "neck-diagram:theme";
const THEMES = [
  {
    id: "jaffa-cake",
    label: "Jaffa Cake",
    preview: "linear-gradient(135deg, #0b1015 0%, #111821 50%, #ffb347 100%)"
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
    preview: "linear-gradient(135deg, #000000 0%, #050505 50%, #ff8c2a 100%)"
  }
] as const;
type ThemeId = (typeof THEMES)[number]["id"];
const DEFAULT_THEME: ThemeId = "jaffa-cake";
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
  mode: "\uf0b0",
  export: "\uf019",
  png: "\uf1c5",
  pdf: "\uf1c1",
  json: "\uf1c9",
  upload: "\uf093",
  trash: "\uf1f8",
  chevron: "\uf078",
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
    a.y + a.height + gap <= b.y ||
    a.y >= b.y + b.height + gap
  );

const EIGHT_STRING_PRESETS = [
  { label: "F# Standard", tuning: DEFAULT_TUNING_8 },
  { label: "Half Step Down", tuning: ["F", "A#", "D#", "G#", "C#", "F#", "A#", "D#"] },
  { label: "Drop E", tuning: ["E", "B", "E", "A", "D", "G", "B", "E"] },
  { label: "E Standard", tuning: ["E", "A", "D", "G", "C", "F", "A", "D"] }
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getDiagramExportHeight = (diagram: NeckDiagram) => {
  const hasCaption = diagram.name?.trim().length > 0;
  return diagram.height + (hasCaption ? EXPORT_CAPTION_HEIGHT : 0);
};

const svgToImage = (svg: SVGSVGElement, caption?: string) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const width = Number(svg.getAttribute("width") ?? svg.clientWidth);
  const height = Number(svg.getAttribute("height") ?? svg.clientHeight);
  let finalHeight = height;

  if (caption && caption.trim().length > 0) {
    finalHeight += EXPORT_CAPTION_HEIGHT;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", `${width / 2}`);
    text.setAttribute("y", `${height + EXPORT_CAPTION_HEIGHT / 2}`);
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

const createDefaultTab = (name = "Tab 1"): ProjectTab => ({
  id: crypto.randomUUID(),
  name
});

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
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
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
    theory: true,
    diagram: true,
    instrument: true,
    settings: true
  });
  const migratedProjectRef = useRef<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const trashRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const requestDeleteRef = useRef<(action: DeleteAction | null) => void>(() => {});
  const expandedSidebarWidthRef = useRef(320);
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [resizingSidebar, setResizingSidebar] = useState(false);
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
      const canvasWidth = canvasSize.width / canvasZoom;
      const canvasHeight = canvasSize.height / canvasZoom;
      return {
        width: US_LETTER_SIZE.width,
        height: US_LETTER_SIZE.height,
        left: Math.max(0, canvasWidth / 2 - US_LETTER_SIZE.width / 2),
        top: Math.max(0, canvasHeight / 2 - US_LETTER_SIZE.height / 2)
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
      !needsLayoutMigration
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
        layoutMode: needsLayoutMigration ? diagram.layoutMode ?? "grid" : diagram.layoutMode
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
    const updates = new Map<string, { x: number; y: number }>();

    orderedGrid.forEach((diagram) => {
      const position = suggestTile(
        [...placed, ...floatingDiagrams],
        canvasSize,
        { width: diagram.width, height: diagram.height },
        TILE_GAP
      );
      placed.push({ ...diagram, x: position.x, y: position.y });
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
        setLibraryResults([]);
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
  }, [libraryQuery, libraryType]);

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
      const zoomFactor = canvasZoom || 1;
      const dx = (event.clientX - dragState.startX) / zoomFactor;
      const dy = (event.clientY - dragState.startY) / zoomFactor;

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
              return { ...diagram, x: nextX, y: nextY };
            }
            const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
            return { ...diagram, x: snap(nextX), y: snap(nextY) };
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
      const shouldDelete =
        dragState?.mode === "move" && dragState?.id ? isOverTrash(dragState.id) : false;
      const dropTabId =
        dragState?.mode === "move" ? getTabDropTarget(event.clientX, event.clientY) : null;
      const shouldMove =
        dropTabId && dragState?.id && dropTabId !== activeTabId ? dropTabId : null;
      dragRef.current = null;
      setDragging(false);
      setDragMode(null);
      setDraggingDiagramId(null);
      setTrashHoverDiagramId(null);
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
  }, [dragging, canvasZoom, activeTabId, tabs, project]);

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
    if (!modeMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!modeMenuRef.current) return;
      if (!modeMenuRef.current.contains(event.target as Node)) {
        setModeMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModeMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [modeMenuOpen]);

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
    const canvasWidth = canvasSize.width;
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || canvasWidth <= 0) {
      setSidebarOffset(0);
      return;
    }

    const contentCenter = (minX + maxX) / 2;
    const desiredOffset = canvasWidth / 2 - contentCenter;
    const minOffset = -minX;
    const maxOffset = canvasWidth - maxX;

    if (minOffset > maxOffset) {
      setSidebarOffset(0);
      return;
    }

    setSidebarOffset(Math.min(maxOffset, Math.max(minOffset, desiredOffset)));
  }, [sidebarCollapsed, canvasSize.width, activeTabId, diagramsInActiveTab.length]);

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

  const buildTheoryName = (
    keyId?: string,
    scaleId?: string,
    positionId?: string
  ) => {
    const keyName = keyId ? libraryIndex[keyId]?.name : undefined;
    const scaleName = scaleId ? libraryIndex[scaleId]?.name : undefined;
    const positionName = positionId ? libraryIndex[positionId]?.name : undefined;
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
    const position = isFirstInTab
      ? getFloatingPosition(DEFAULT_DIAGRAM_SIZE)
      : suggestTile(gridDiagrams, canvasSize, DEFAULT_DIAGRAM_SIZE, TILE_GAP);
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
    if (replaceId) {
      const existing = project.data.diagrams.find((diagram) => diagram.id === replaceId);
      if (existing) {
        targetTabId = existing.tabId ?? targetTabId;
      }
    }
    const diagramsForTile = project.data.diagrams.filter(
      (diagram) => diagram.tabId === targetTabId
    );
    const isFirstInTab = diagramsForTile.length === 0;
    const gridDiagrams = diagramsForTile.filter(isGridDiagram);
    const position = isFirstInTab
      ? getFloatingPosition(DEFAULT_DIAGRAM_SIZE)
      : suggestTile(gridDiagrams, canvasSize, DEFAULT_DIAGRAM_SIZE, TILE_GAP);
    const nameIndex = project.data.diagrams.length + 1;
    const generatedName = buildTheoryName(
      project.data.keyId,
      project.data.scaleId,
      project.data.positionId
    );
    const selectedPositionName = project.data.positionId
      ? libraryIndex[project.data.positionId]?.name
      : undefined;
    const positionPreset = getPositionPreset(selectedPositionName);
    const nextFrets = positionPreset?.minFrets
      ? Math.max(DEFAULT_NECK_CONFIG.frets, positionPreset.minFrets)
      : DEFAULT_NECK_CONFIG.frets;
    const diagram = createNeckDiagram({
      x: position.x,
      y: position.y,
      name: generatedName || `Neck ${nameIndex}`,
      labelMode: defaultLabelMode,
      tabId: targetTabId,
      layoutMode: isFirstInTab ? "float" : "grid",
      config: {
        ...DEFAULT_NECK_CONFIG,
        frets: nextFrets
      },
      keyId: project.data.keyId,
      scaleId: project.data.scaleId,
      positionId: project.data.positionId
    });
    const rootKey = project.data.keyId ? libraryIndex[project.data.keyId]?.name : undefined;
    const scaleIntervals = project.data.scaleId
      ? libraryIndex[project.data.scaleId]?.intervals ?? null
      : null;
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
    let mode: DragMode | null = null;
    if (event.metaKey || event.ctrlKey) {
      mode = "move";
    } else if (event.altKey) {
      mode = event.shiftKey ? "scale" : "resize";
    }
    if (!mode) return;
    if (mode === "move" && diagram.layoutMode !== "float") {
      updateDiagram(diagram.id, (item) => ({ ...item, layoutMode: "float" }));
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
      }
    };
    setDragging(true);
    setDragMode(mode);
    setDraggingDiagramId(mode === "move" ? diagram.id : null);
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

  const normalizeProjectData = (data: ProjectData) => {
    const now = new Date().toISOString();
    const incomingTabs = Array.isArray(data.tabs) ? data.tabs.filter((tab) => tab?.id) : [];
    const tabs = incomingTabs.length > 0 ? incomingTabs : [createDefaultTab()];
    const activeTabId =
      data.activeTabId && tabs.some((tab) => tab.id === data.activeTabId)
        ? data.activeTabId
        : tabs[0].id;
    const diagrams = Array.isArray(data.diagrams)
      ? data.diagrams.map((diagram) => ({
          ...diagram,
          tabId: tabs.some((tab) => tab.id === diagram.tabId) ? diagram.tabId : activeTabId,
          layoutMode: diagram.layoutMode ?? "grid"
        }))
      : [];
    const diagramsInActiveTab = diagrams.filter((diagram) => diagram.tabId === activeTabId);
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

  const parseProjectPayload = (parsed: unknown) => {
    const fallback = { title: null as string | null, data: null as ProjectData | null };
    if (!parsed || typeof parsed !== "object") return fallback;
    const record = parsed as { title?: unknown; data?: unknown };
    const title = typeof record.title === "string" ? record.title.trim() : null;
    if (record.data && typeof record.data === "object" && Array.isArray((record.data as ProjectData).diagrams)) {
      return { title, data: normalizeProjectData(record.data as ProjectData) };
    }
    if (Array.isArray((parsed as ProjectData).diagrams)) {
      return { title, data: normalizeProjectData(parsed as ProjectData) };
    }
    return fallback;
  };

  const normalizeImportedDiagram = (
    diagram: NeckDiagram,
    tabId: string,
    existingIds: Set<string>
  ) => {
    const nextId = diagram.id && !existingIds.has(diagram.id) ? diagram.id : crypto.randomUUID();
    existingIds.add(nextId);
    const config = { ...DEFAULT_NECK_CONFIG, ...(diagram.config ?? {}) };
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

  const exportSelectedDiagramJson = () => {
    if (!selectedDiagram) return;
    const theoryName = getDiagramTheoryName(selectedDiagram);
    const baseName = theoryName || selectedDiagram.name || "diagram";
    const filename = `${slugify(baseName) || "diagram"}.json`;
    const exportedAt = new Date().toISOString();
    const payload = {
      diagram: selectedDiagram,
      exportedAt,
      version: 1
    };
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
    setTitleInput(title);
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        title,
        updatedAt: new Date().toISOString()
      };
    });
    const filename = `${slugify(title) || "neck-diagram"}.json`;
    const exportedAt = new Date();
    const tabId = crypto.randomUUID();
    const data: ProjectData = {
      diagrams: diagramsInActiveTab.map((diagram) => ({ ...diagram, tabId })),
      tabs: [{ id: tabId, name: tabName }],
      activeTabId: tabId,
      selectedDiagramId: diagramsInActiveTab[0]?.id,
      createdAt: project.data.createdAt,
      updatedAt: new Date().toISOString()
    };
    const payload = {
      title,
      data,
      metadata: {
        exportedAt: exportedAt.toISOString(),
        exportedOn: formatExportDate(exportedAt)
      },
      version: 1
    };
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      window.alert("Invalid JSON file.");
      return;
    }

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
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        title,
        updatedAt: new Date().toISOString()
      };
    });
    setTitleInput(title);
  };

  const importDiagramJson = async (file: File) => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      window.alert("Invalid JSON file.");
      return;
    }

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
    if (!project) return;
    if (!project.data.tabs?.some((tab) => tab.id === tabId)) return;
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

  const closeModeMenu = () => setModeMenuOpen(false);
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

    try {
      setExporting(true);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const { image, width, height } = await svgToImage(svg, selectedDiagram.name);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * EXPORT_SCALE);
      canvas.height = Math.round(height * EXPORT_SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas rendering failed.");
      ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0);

      const theoryName = getDiagramTheoryName(selectedDiagram);
      const filename =
        format === "pdf" && theoryName
          ? slugify(theoryName) || buildExportName(selectedDiagram)
          : buildExportName(selectedDiagram);

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
      const pdf = new jsPDF({
        orientation: width >= height ? "landscape" : "portrait",
        unit: "px",
        format: [Math.round(width), Math.round(height + headerHeight)]
      });
      const pngData = canvas.toDataURL("image/png");
      pdf.setFontSize(12);
      pdf.setTextColor(120);
      pdf.text(exportLabel, 12, 18);
      pdf.addImage(pngData, "PNG", 0, headerHeight, width, height);
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

      const pngData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: width >= height ? "landscape" : "portrait",
        unit: "px",
        format: [width, height + headerHeight]
      });
      pdf.setFontSize(12);
      pdf.setTextColor(120);
      pdf.text(exportLabel, 12, 18);
      pdf.addImage(pngData, "PNG", 0, headerHeight, width, height);

      const tabName = activeTab ? getTabDisplayName(activeTab, activeTabIndex) : "page";
      const fileBase = slugify(`${project.title}-${tabName}`) || "page";
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
      const tabName = activeTab ? getTabDisplayName(activeTab, activeTabIndex) : "page";
      const fileBase = slugify(`${project.title}-${tabName}`) || "page";
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
      const nextStrings = patch.strings ?? diagram.config.strings;
      const nextTuning = patch.tuning
        ? normalizeTuning(nextStrings, patch.tuning)
        : normalizeTuning(nextStrings, diagram.config.tuning);
      return {
        ...diagram,
        config: {
          ...diagram.config,
          ...patch,
          strings: nextStrings,
          tuning: nextTuning
        }
      };
    });
  };

  const handleLibrarySelect = (item: LibraryItem) => {
    setLibraryIndex((prev) => ({ ...prev, [item.id]: item }));

    if (item.type === "key") {
      updateProjectData((data) => ({ ...data, keyId: item.id }));
    }

    if (item.type === "scale" || item.type === "mode") {
      updateProjectData((data) => ({ ...data, scaleId: item.id }));
    }

    if (item.type === "position") {
      updateProjectData((data) => ({ ...data, positionId: item.id }));
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
  const todayLabel = formatExportDate(new Date());

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
            <a href="https://www.iconoclastaud.io/" target="_blank" rel="noreferrer">
              Iconoclast Aud.io
            </a>
            <span> // Neck Diagram Studio</span>
          </span>
        </div>
        <div className="header-meta">
          <span className="header-date">{todayLabel}</span>
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
                setModeMenuOpen(false);
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
                setModeMenuOpen(false);
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
                    updateProjectData((data) => ({ ...data, keyId: nextId }));
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
                    updateProjectData((data) => ({ ...data, scaleId: nextId }));
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
                    updateProjectData((data) => ({ ...data, positionId: nextId }));
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
                        const position = suggestTile(
                          gridDiagrams,
                          canvasSize,
                          { width: selectedDiagram.width, height: selectedDiagram.height },
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
                        updateDiagram(selectedDiagram.id, (diagram) => ({
                          ...diagram,
                          keyId: nextId
                        }));
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
                        updateDiagram(selectedDiagram.id, (diagram) => ({
                          ...diagram,
                          scaleId: nextId
                        }));
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
                        updateDiagram(selectedDiagram.id, (diagram) => ({
                          ...diagram,
                          positionId: nextId
                        }));
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
                    <div className={`dropdown field-dropdown${modeMenuOpen ? " is-open" : ""}`} ref={modeMenuRef}>
                      <button
                        className="tool-button"
                        type="button"
                        onClick={() => {
                          setModeMenuOpen((prev) => !prev);
                          setImportMenuOpen(false);
                          setExportMenuOpen(false);
                        }}
                        aria-expanded={modeMenuOpen}
                        aria-haspopup="menu"
                      >
                        <span className="nf-icon" aria-hidden="true">
                          {ICONS.mode}
                        </span>
                        <span>Mode</span>
                        <span className="nf-icon" aria-hidden="true">
                          {ICONS.chevron}
                        </span>
                      </button>
                      {modeMenuOpen ? (
                        <div className="dropdown-menu" role="menu">
                          {(["key", "interval", "picking"] as LabelMode[]).map((mode) => {
                            const isActive = (selectedDiagram.labelMode ?? defaultLabelMode) === mode;
                            const label = mode === "key" ? "Key" : mode === "interval" ? "Interval" : "Picking";
                            return (
                              <button
                                key={mode}
                                className={`dropdown-item${isActive ? " is-active" : ""}`}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isActive}
                                onClick={() => {
                                  handleLabelModeChange(mode);
                                  closeModeMenu();
                                }}
                              >
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
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
                      onChange={(event) =>
                        handleConfigChange({
                          displayStandardTuning: event.target.value === "standard"
                        })
                      }
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
              {sidebarCollapsed && outlineMetrics ? (
                <div
                  className="page-frame"
                  style={{
                    width: outlineMetrics.width,
                    height: outlineMetrics.height,
                    left: outlineMetrics.left,
                    top: outlineMetrics.top
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
