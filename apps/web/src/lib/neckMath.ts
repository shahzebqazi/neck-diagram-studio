export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11
};

export const INTERVAL_LABELS = [
  "1",
  "b2",
  "2",
  "b3",
  "3",
  "4",
  "#4",
  "5",
  "b6",
  "6",
  "b7",
  "7"
];

export const noteNameToIndex = (name?: string | null) => {
  if (!name) return null;
  const normalized = name.trim();
  return NOTE_INDEX[normalized] ?? null;
};

export const getFretPositions = (frets: number, width: number) => {
  const positions: number[] = [0];

  for (let fret = 1; fret <= frets; fret += 1) {
    const ratio = 1 - 1 / Math.pow(2, fret / 12);
    positions.push(ratio * width);
  }

  const last = positions[positions.length - 1] ?? 0;
  if (last <= 0) return positions;
  const scale = width / last;
  return positions.map((value) => value * scale);
};

export const getStringPositions = (strings: number, height: number) => {
  if (strings <= 1) return [height / 2];
  const spacing = height / (strings - 1);
  return Array.from({ length: strings }, (_, index) => index * spacing);
};

export const getNoteIndex = (
  tuning: string[],
  stringIndex: number,
  fret: number,
  capo: number
) => {
  const open = noteNameToIndex(tuning[stringIndex]);
  if (open === null) return null;
  const fretValue = fret < 0 ? 0 : fret + 1;
  return (open + fretValue + capo) % 12;
};

export const getIntervalLabel = (rootIndex: number, noteIndex: number) => {
  const interval = (noteIndex - rootIndex + 12) % 12;
  return INTERVAL_LABELS[interval];
};

export const findFretAtX = (positions: number[], x: number) => {
  for (let i = 0; i < positions.length - 1; i += 1) {
    if (x >= positions[i] && x <= positions[i + 1]) {
      return i;
    }
  }
  return positions.length - 2;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
