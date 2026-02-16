// =============================================================================
// Neck Diagrams - TypeScript Type Definitions
// =============================================================================
// Keep these in sync with backend/src/Types.hs
// =============================================================================

// =============================================================================
// User Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface UserCreate {
  email: string;
  name?: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// =============================================================================
// Project Types
// =============================================================================

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Project {
  id: string;
  title: string;
  userId: string;
  canvasState?: CanvasState;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreate {
  title?: string;
}

export interface ProjectUpdate {
  title?: string;
  canvasState?: CanvasState;
}

// =============================================================================
// Diagram Types
// =============================================================================

export type NoteType = 'interval' | 'key' | 'picking';

export interface Note {
  string: number;
  fret: number;
  type: NoteType;
  value: string;
  isRoot: boolean;
  isGhost: boolean;
}

export interface DiagramConfig {
  strings: number;
  frets: number;
  startFret: number;
  capo: number;
  scaleLength: number;
  multiscaleAngle: number;
}

export interface Diagram {
  id: string;
  projectId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: DiagramConfig;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

export interface DiagramCreate {
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  config?: Partial<DiagramConfig>;
  notes?: Note[];
}

export interface DiagramUpdate {
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  config?: Partial<DiagramConfig>;
  notes?: Note[];
}

// =============================================================================
// Scale Types
// =============================================================================

export interface Scale {
  id: string;
  name: string;
  category: string;
  intervals: number[];
  notes?: string[];
  rootNote?: string;
  modeNumber?: number;
}

export interface ScaleShape {
  id: string;
  scaleId: string;
  name: string;
  category: string;
  startFret: number;
  pattern: ShapeNote[];
}

export interface ShapeNote {
  string: number;
  fret: number;
  interval: string;
  isRoot: boolean;
}

// =============================================================================
// Tuning Types
// =============================================================================

export interface Tuning {
  id: string;
  name: string;
  strings: number;
  notes: string[];
  category: string;
  instrument: string;
}

// =============================================================================
// Canvas Tool Types
// =============================================================================

export type ToolType = 'select' | 'pan' | 'note';

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// =============================================================================
// Export Types
// =============================================================================

export interface ExportOptions {
  target: 'diagram' | 'page';
  format: 'png' | 'pdf';
  scale: number;
  backgroundColor: string;
  includeTitle: boolean;
  includeDate: boolean;
  padding: number;
}

// =============================================================================
// API Error
// =============================================================================

export interface ApiError {
  error: {
    code: number;
    message: string;
  };
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_DIAGRAM_CONFIG: DiagramConfig = {
  strings: 6,
  frets: 5,
  startFret: 0,
  capo: 0,
  scaleLength: 25.5,
  multiscaleAngle: 0,
};

export const DEFAULT_CANVAS_STATE: CanvasState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  target: 'page',
  format: 'png',
  scale: 2,
  backgroundColor: '#ffffff',
  includeTitle: true,
  includeDate: true,
  padding: 20,
};
