/**
 * Single source of truth for library items (keys, scales, modes, positions).
 * Consumed by apps/api (seed) and apps/web (fallback defaults).
 * stableId format: default:${type}:${slug(name)} — e.g. default:key:g, default:scale:major-ionian
 */

export type LibraryType = "scale" | "mode" | "shape" | "position" | "key";

export type CanonicalLibraryItem = {
  stableId: string;
  type: LibraryType;
  name: string;
  intervals: number[];
};

function slugify(value: string): string {
  return value
    .replace(/#/g, " sharp ")
    .replace(/♯/g, " sharp ")
    .replace(/♭/g, " flat ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableId(type: LibraryType, name: string): string {
  return `default:${type}:${slugify(name)}`;
}

const SCALES: Omit<CanonicalLibraryItem, "stableId">[] = [
  { type: "scale", name: "Major (Ionian)", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { type: "scale", name: "Natural Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { type: "scale", name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
  { type: "scale", name: "Melodic Minor", intervals: [0, 2, 3, 5, 7, 9, 11] },
  { type: "scale", name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9] },
  { type: "scale", name: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10] },
  { type: "scale", name: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
];

const MODES: Omit<CanonicalLibraryItem, "stableId">[] = [
  { type: "mode", name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
  { type: "mode", name: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] },
  { type: "mode", name: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11] },
  { type: "mode", name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { type: "mode", name: "Locrian", intervals: [0, 1, 3, 5, 6, 8, 10] },
];

const POSITIONS: Omit<CanonicalLibraryItem, "stableId">[] = [
  { type: "position", name: "Position 1", intervals: [] },
  { type: "position", name: "Position 2", intervals: [] },
  { type: "position", name: "Position 3", intervals: [] },
  { type: "position", name: "Position 4", intervals: [] },
  { type: "position", name: "Position 5", intervals: [] },
  { type: "position", name: "Position 6", intervals: [] },
  { type: "position", name: "Position 7", intervals: [] },
  { type: "position", name: "1-12", intervals: [] },
  { type: "position", name: "12-24", intervals: [] },
  { type: "position", name: "12-27", intervals: [] },
  { type: "position", name: "Whole Neck", intervals: [] },
];

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const KEYS: Omit<CanonicalLibraryItem, "stableId">[] = KEY_NAMES.map((name) => ({
  type: "key" as const,
  name,
  intervals: [],
}));

function withStableId(items: Omit<CanonicalLibraryItem, "stableId">[]): CanonicalLibraryItem[] {
  return items.map((item) => ({
    ...item,
    stableId: stableId(item.type, item.name),
  }));
}

/** Canonical list of all library items with stableIds. */
export const CANONICAL_LIBRARY_ITEMS: CanonicalLibraryItem[] = [
  ...withStableId(SCALES),
  ...withStableId(MODES),
  ...withStableId(POSITIONS),
  ...withStableId(KEYS),
];
