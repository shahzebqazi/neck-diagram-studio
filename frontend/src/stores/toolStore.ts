import { create } from 'zustand';
import type { NoteType } from '@/types';

interface ToolStore {
  // Note tool settings
  noteType: NoteType;
  noteValue: string;
  isRootNote: boolean;
  isGhostNote: boolean;
  
  // Actions
  setNoteType: (type: NoteType) => void;
  setNoteValue: (value: string) => void;
  setIsRootNote: (isRoot: boolean) => void;
  setIsGhostNote: (isGhost: boolean) => void;
  
  // Presets
  setIntervalPreset: (interval: string) => void;
  setKeyPreset: (key: string) => void;
  setPickingPreset: (direction: string) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  noteType: 'interval',
  noteValue: 'R',
  isRootNote: true,
  isGhostNote: false,

  setNoteType: (type: NoteType) => {
    set({ noteType: type });
    // Set default value for type
    if (type === 'interval') {
      set({ noteValue: 'R', isRootNote: true });
    } else if (type === 'key') {
      set({ noteValue: 'C', isRootNote: false });
    } else if (type === 'picking') {
      set({ noteValue: '↓', isRootNote: false });
    }
  },

  setNoteValue: (value: string) => {
    set({ noteValue: value, isRootNote: value === 'R' });
  },

  setIsRootNote: (isRoot: boolean) => {
    set({ isRootNote: isRoot });
  },

  setIsGhostNote: (isGhost: boolean) => {
    set({ isGhostNote: isGhost });
  },

  setIntervalPreset: (interval: string) => {
    set({
      noteType: 'interval',
      noteValue: interval,
      isRootNote: interval === 'R',
    });
  },

  setKeyPreset: (key: string) => {
    set({
      noteType: 'key',
      noteValue: key,
      isRootNote: false,
    });
  },

  setPickingPreset: (direction: string) => {
    set({
      noteType: 'picking',
      noteValue: direction,
      isRootNote: false,
    });
  },
}));

// Interval options
export const INTERVALS = [
  'R', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', 'b6', '6', 'b7', '7',
];

// Key options
export const KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

// Picking options
export const PICKING_SYMBOLS = ['↓', '↑', '⤓', '⤒', 'x', 'o'];
