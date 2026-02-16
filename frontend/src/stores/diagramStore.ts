import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Diagram, DiagramConfig, Note } from '@/types';

interface DiagramStore {
  // State
  diagrams: Map<string, Diagram>;
  projectId: string | null;
  // Cached array to prevent recreation on every access
  _diagramsArrayCache: Diagram[];
  _diagramsArrayVersion: number;
  
  // Actions
  setProjectId: (id: string | null) => void;
  setDiagrams: (diagrams: Diagram[]) => void;
  
  addDiagram: (config?: Partial<DiagramConfig>, position?: { x: number; y: number }) => Diagram;
  updateDiagram: (id: string, updates: Partial<Diagram>) => void;
  deleteDiagram: (id: string) => void;
  duplicateDiagram: (id: string, offset?: { x: number; y: number }) => Diagram | null;
  
  // Position/Size
  moveDiagram: (id: string, x: number, y: number) => void;
  resizeDiagram: (id: string, width: number, height: number) => void;
  
  // Notes
  addNote: (diagramId: string, note: Note) => void;
  updateNote: (diagramId: string, noteIndex: number, updates: Partial<Note>) => void;
  removeNote: (diagramId: string, noteIndex: number) => void;
  toggleNote: (
    diagramId: string,
    string: number,
    fret: number,
    noteValue: string,
    noteType?: Note['type'],
    isGhost?: boolean
  ) => void;
  clearNotes: (diagramId: string) => void;
  
  // Config
  updateConfig: (diagramId: string, config: Partial<DiagramConfig>) => void;
  
  // Tiling
  findNextPosition: (width: number, height: number) => { x: number; y: number };
  
  // Getters
  getDiagram: (id: string) => Diagram | undefined;
  getDiagramsArray: () => Diagram[];
}

const DEFAULT_CONFIG: DiagramConfig = {
  strings: 6,
  frets: 5,
  startFret: 0,
  capo: 0,
  scaleLength: 25.5,
  multiscaleAngle: 0,
};

const DIAGRAM_PADDING = 20;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 200;

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  diagrams: new Map(),
  projectId: null,
  _diagramsArrayCache: [],
  _diagramsArrayVersion: 0,

  setProjectId: (id: string | null) => {
    set({ projectId: id });
  },

  setDiagrams: (diagrams: Diagram[]) => {
    const map = new Map<string, Diagram>();
    diagrams.forEach((d) => map.set(d.id, d));
    set({ 
      diagrams: map, 
      _diagramsArrayCache: diagrams,
      _diagramsArrayVersion: get()._diagramsArrayVersion + 1 
    });
  },

  addDiagram: (config?: Partial<DiagramConfig>, position?: { x: number; y: number }) => {
    const { projectId } = get();
    const pos = position || get().findNextPosition(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    
    const diagram: Diagram = {
      id: uuidv4(),
      projectId: projectId || '',
      title: 'New Diagram',
      x: pos.x,
      y: pos.y,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      config: { ...DEFAULT_CONFIG, ...config },
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const newDiagrams = new Map(state.diagrams);
      newDiagrams.set(diagram.id, diagram);
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });

    return diagram;
  },

  updateDiagram: (id: string, updates: Partial<Diagram>) => {
    set((state) => {
      const diagram = state.diagrams.get(id);
      if (!diagram) return state;

      const newDiagrams = new Map(state.diagrams);
      newDiagrams.set(id, {
        ...diagram,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });
  },

  deleteDiagram: (id: string) => {
    set((state) => {
      const newDiagrams = new Map(state.diagrams);
      newDiagrams.delete(id);
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });
  },

  duplicateDiagram: (id: string, offset = { x: 50, y: 50 }) => {
    const { diagrams } = get();
    const original = diagrams.get(id);
    if (!original) return null;

    const duplicate: Diagram = {
      ...original,
      id: uuidv4(),
      title: `${original.title} (copy)`,
      x: original.x + offset.x,
      y: original.y + offset.y,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const newDiagrams = new Map(state.diagrams);
      newDiagrams.set(duplicate.id, duplicate);
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });

    return duplicate;
  },

  moveDiagram: (id: string, x: number, y: number) => {
    get().updateDiagram(id, { x, y });
  },

  resizeDiagram: (id: string, width: number, height: number) => {
    get().updateDiagram(id, { width: Math.max(200, width), height: Math.max(100, height) });
  },

  addNote: (diagramId: string, note: Note) => {
    set((state) => {
      const diagram = state.diagrams.get(diagramId);
      if (!diagram) return state;

      const newDiagrams = new Map(state.diagrams);
      newDiagrams.set(diagramId, {
        ...diagram,
        notes: [...diagram.notes, note],
        updatedAt: new Date().toISOString(),
      });
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });
  },

  updateNote: (diagramId: string, noteIndex: number, updates: Partial<Note>) => {
    set((state) => {
      const diagram = state.diagrams.get(diagramId);
      if (!diagram || noteIndex < 0 || noteIndex >= diagram.notes.length) return state;

      const newNotes = [...diagram.notes];
      newNotes[noteIndex] = { ...newNotes[noteIndex], ...updates };

      const newDiagrams = new Map(state.diagrams);
      newDiagrams.set(diagramId, {
        ...diagram,
        notes: newNotes,
        updatedAt: new Date().toISOString(),
      });
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });
  },

  removeNote: (diagramId: string, noteIndex: number) => {
    set((state) => {
      const diagram = state.diagrams.get(diagramId);
      if (!diagram) return state;

      const newNotes = diagram.notes.filter((_, i) => i !== noteIndex);

      const newDiagrams = new Map(state.diagrams);
      newDiagrams.set(diagramId, {
        ...diagram,
        notes: newNotes,
        updatedAt: new Date().toISOString(),
      });
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });
  },

  toggleNote: (
    diagramId: string,
    string: number,
    fret: number,
    noteValue: string,
    noteType: Note['type'] = 'interval',
    isGhost = false
  ) => {
    const { diagrams } = get();
    const diagram = diagrams.get(diagramId);
    if (!diagram) return;

    const existingIndex = diagram.notes.findIndex(
      (n) => n.string === string && n.fret === fret
    );

    if (existingIndex >= 0) {
      get().removeNote(diagramId, existingIndex);
    } else {
      get().addNote(diagramId, {
        string,
        fret,
        type: noteType,
        value: noteValue,
        isRoot: noteType === 'interval' && noteValue === 'R',
        isGhost,
      });
    }
  },

  clearNotes: (diagramId: string) => {
    get().updateDiagram(diagramId, { notes: [] });
  },

  updateConfig: (diagramId: string, config: Partial<DiagramConfig>) => {
    set((state) => {
      const diagram = state.diagrams.get(diagramId);
      if (!diagram) return state;

      const newDiagrams = new Map(state.diagrams);
      newDiagrams.set(diagramId, {
        ...diagram,
        config: { ...diagram.config, ...config },
        updatedAt: new Date().toISOString(),
      });
      const newCache = Array.from(newDiagrams.values());
      return { 
        diagrams: newDiagrams, 
        _diagramsArrayCache: newCache,
        _diagramsArrayVersion: state._diagramsArrayVersion + 1 
      };
    });
  },

  findNextPosition: (width: number, height: number) => {
    const { diagrams } = get();
    const diagramsArray = Array.from(diagrams.values());

    if (diagramsArray.length === 0) {
      return { x: DIAGRAM_PADDING, y: DIAGRAM_PADDING };
    }

    // Simple grid-based tiling
    const cols = 3;
    const row = Math.floor(diagramsArray.length / cols);
    const col = diagramsArray.length % cols;

    return {
      x: col * (width + DIAGRAM_PADDING) + DIAGRAM_PADDING,
      y: row * (height + DIAGRAM_PADDING) + DIAGRAM_PADDING,
    };
  },

  getDiagram: (id: string) => {
    return get().diagrams.get(id);
  },

  getDiagramsArray: () => {
    // Return cached array to maintain referential equality
    return get()._diagramsArrayCache;
  },
}));
