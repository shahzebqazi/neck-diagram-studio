import type { LibraryItem } from "@shared/types";

type LibrarySeedItem = Omit<LibraryItem, "id">;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const withIds = (items: LibrarySeedItem[]): LibraryItem[] =>
  items.map((item) => ({
    ...item,
    id: `default:${item.type}:${slugify(item.name)}`
  }));

const BASE_LIBRARY: LibrarySeedItem[] = [
  { type: "scale", name: "Major (Ionian)", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { type: "scale", name: "Natural Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { type: "scale", name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
  { type: "scale", name: "Melodic Minor", intervals: [0, 2, 3, 5, 7, 9, 11] },
  { type: "scale", name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9] },
  { type: "scale", name: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10] },
  { type: "scale", name: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
  { type: "mode", name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
  { type: "mode", name: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] },
  { type: "mode", name: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11] },
  { type: "mode", name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { type: "mode", name: "Locrian", intervals: [0, 1, 3, 5, 6, 8, 10] },
  { type: "position", name: "Position 1", intervals: [] },
  { type: "position", name: "Position 2", intervals: [] },
  { type: "position", name: "Position 3", intervals: [] },
  { type: "position", name: "Position 4", intervals: [] },
  { type: "position", name: "Position 5", intervals: [] },
  { type: "position", name: "1-12", intervals: [] },
  { type: "position", name: "12-24", intervals: [] },
  { type: "position", name: "Whole Neck", intervals: [] }
];

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const DEFAULT_LIBRARY = withIds([
  ...BASE_LIBRARY,
  ...KEY_NAMES.map((name) => ({ type: "key", name, intervals: [] }))
]);

const filterType = (type: LibraryItem["type"]) =>
  DEFAULT_LIBRARY.filter((item) => item.type === type);

export const DEFAULT_KEYS = filterType("key");
export const DEFAULT_SCALES = filterType("scale");
export const DEFAULT_MODES = filterType("mode");
export const DEFAULT_POSITIONS = filterType("position");
