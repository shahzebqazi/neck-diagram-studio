import { create } from 'zustand';
import type { CanvasState, ToolType, SelectionBox } from '@/types';

interface CanvasStore {
  // Canvas state
  zoom: number;
  panX: number;
  panY: number;
  
  // Tool state
  activeTool: ToolType;
  
  // Selection state
  selectedIds: string[];
  selectionBox: SelectionBox | null;
  
  // Interaction state
  isDragging: boolean;
  isPanning: boolean;
  isResizing: boolean;
  
  // Viewport
  viewportWidth: number;
  viewportHeight: number;
  
  // Actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  setCanvasState: (state: Partial<CanvasState>) => void;
  
  setActiveTool: (tool: ToolType) => void;
  
  selectItem: (id: string, addToSelection?: boolean) => void;
  deselectItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectionBox: (box: SelectionBox | null) => void;
  
  setIsDragging: (isDragging: boolean) => void;
  setIsPanning: (isPanning: boolean) => void;
  setIsResizing: (isResizing: boolean) => void;
  
  setViewport: (width: number, height: number) => void;
  
  // Utility
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  canvasToScreen: (canvasX: number, canvasY: number) => { x: number; y: number };
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTool: 'select',
  selectedIds: [],
  selectionBox: null,
  isDragging: false,
  isPanning: false,
  isResizing: false,
  viewportWidth: 0,
  viewportHeight: 0,

  // Zoom actions
  setZoom: (zoom: number) => {
    set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) });
  },

  zoomIn: () => {
    const { zoom } = get();
    set({ zoom: Math.min(MAX_ZOOM, zoom + ZOOM_STEP) });
  },

  zoomOut: () => {
    const { zoom } = get();
    set({ zoom: Math.max(MIN_ZOOM, zoom - ZOOM_STEP) });
  },

  resetZoom: () => {
    set({ zoom: 1, panX: 0, panY: 0 });
  },

  // Pan actions
  setPan: (x: number, y: number) => {
    set({ panX: x, panY: y });
  },

  panBy: (dx: number, dy: number) => {
    const { panX, panY } = get();
    set({ panX: panX + dx, panY: panY + dy });
  },

  setCanvasState: (state: Partial<CanvasState>) => {
    set({
      zoom: state.zoom ?? get().zoom,
      panX: state.panX ?? get().panX,
      panY: state.panY ?? get().panY,
    });
  },

  // Tool actions
  setActiveTool: (tool: ToolType) => {
    set({ activeTool: tool });
  },

  // Selection actions
  selectItem: (id: string, addToSelection = false) => {
    const { selectedIds } = get();
    if (addToSelection) {
      if (!selectedIds.includes(id)) {
        set({ selectedIds: [...selectedIds, id] });
      }
    } else {
      set({ selectedIds: [id] });
    }
  },

  deselectItem: (id: string) => {
    const { selectedIds } = get();
    set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
  },

  selectAll: (ids: string[]) => {
    set({ selectedIds: ids });
  },

  clearSelection: () => {
    set({ selectedIds: [], selectionBox: null });
  },

  setSelectionBox: (box: SelectionBox | null) => {
    set({ selectionBox: box });
  },

  // Interaction state
  setIsDragging: (isDragging: boolean) => {
    set({ isDragging });
  },

  setIsPanning: (isPanning: boolean) => {
    set({ isPanning });
  },

  setIsResizing: (isResizing: boolean) => {
    set({ isResizing });
  },

  // Viewport
  setViewport: (width: number, height: number) => {
    set({ viewportWidth: width, viewportHeight: height });
  },

  // Coordinate conversion
  screenToCanvas: (screenX: number, screenY: number) => {
    const { zoom, panX, panY } = get();
    return {
      x: (screenX - panX) / zoom,
      y: (screenY - panY) / zoom,
    };
  },

  canvasToScreen: (canvasX: number, canvasY: number) => {
    const { zoom, panX, panY } = get();
    return {
      x: canvasX * zoom + panX,
      y: canvasY * zoom + panY,
    };
  },
}));
