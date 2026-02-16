// =============================================================================
// Music Theory - Scales and Intervals
// =============================================================================

// Note names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Interval names
export const INTERVAL_NAMES: Record<number, string> = {
  0: 'R',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: '#5',
  9: '6',
  10: 'b7',
  11: '7',
};

// Interval to semitones
export const INTERVAL_TO_SEMITONES: Record<string, number> = {
  'R': 0,
  'b2': 1, '2': 2,
  'b3': 3, '3': 4,
  '4': 5,
  'b5': 6, '#4': 6,
  '5': 7,
  '#5': 8, 'b6': 8,
  '6': 9,
  'bb7': 9, 'b7': 10,
  '7': 11,
};

// Get note name from index (0 = C)
export function getNoteNameFromIndex(index: number, preferFlats = false): string {
  const normalized = ((index % 12) + 12) % 12;
  return preferFlats ? NOTE_NAMES_FLAT[normalized] : NOTE_NAMES[normalized];
}

// Get note index from name
export function getNoteIndexFromName(name: string): number {
  // Normalize the name
  const upperName = name.toUpperCase();
  let index = NOTE_NAMES.indexOf(upperName);
  if (index === -1) {
    index = NOTE_NAMES_FLAT.indexOf(upperName);
  }
  if (index === -1) {
    // Handle enharmonic equivalents
    if (upperName === 'CB') return 11;
    if (upperName === 'B#') return 0;
    if (upperName === 'E#') return 5;
    if (upperName === 'FB') return 4;
  }
  return index;
}

// Get interval name from semitones
export function getIntervalName(semitones: number): string {
  const normalized = ((semitones % 12) + 12) % 12;
  return INTERVAL_NAMES[normalized] || String(normalized);
}

// Apply scale intervals to a root note
export function getScaleNotes(root: string, intervals: number[]): string[] {
  const rootIndex = getNoteIndexFromName(root);
  return intervals.map((interval) => getNoteNameFromIndex(rootIndex + interval));
}

// Get fret position for a note on a string
export function getFretForNote(
  stringNote: string,
  targetNote: string,
  startFret: number = 0,
  maxFret: number = 24
): number[] {
  const stringIndex = getNoteIndexFromName(stringNote);
  const targetIndex = getNoteIndexFromName(targetNote);
  const frets: number[] = [];

  for (let fret = startFret; fret <= maxFret; fret++) {
    const noteAtFret = (stringIndex + fret) % 12;
    if (noteAtFret === targetIndex) {
      frets.push(fret);
    }
  }

  return frets;
}

// Standard tunings (low to high string)
export const STANDARD_TUNINGS: Record<string, string[]> = {
  'guitar-6': ['E', 'A', 'D', 'G', 'B', 'E'],
  'guitar-7': ['B', 'E', 'A', 'D', 'G', 'B', 'E'],
  'guitar-8': ['F#', 'B', 'E', 'A', 'D', 'G', 'B', 'E'],
  'bass-4': ['E', 'A', 'D', 'G'],
  'bass-5': ['B', 'E', 'A', 'D', 'G'],
  'bass-6': ['B', 'E', 'A', 'D', 'G', 'C'],
};

// Get tuning for string count
export function getTuningForStrings(stringCount: number, instrument: string = 'guitar'): string[] {
  const key = `${instrument}-${stringCount}`;
  return STANDARD_TUNINGS[key] || STANDARD_TUNINGS['guitar-6'];
}

// Generate scale pattern for fretboard
export interface FretboardNote {
  string: number;
  fret: number;
  note: string;
  interval: string;
  isRoot: boolean;
}

export function generateScalePattern(
  root: string,
  intervals: number[],
  tuning: string[],
  startFret: number = 0,
  fretCount: number = 5
): FretboardNote[] {
  const notes: FretboardNote[] = [];
  const scaleNotes = getScaleNotes(root, intervals);

  tuning.forEach((stringNote, stringIndex) => {
    for (let fret = startFret; fret <= startFret + fretCount; fret++) {
      const noteIndex = (getNoteIndexFromName(stringNote) + fret) % 12;
      const noteName = getNoteNameFromIndex(noteIndex);

      const scaleIndex = scaleNotes.findIndex(
        (sn) => getNoteIndexFromName(sn) === noteIndex
      );

      if (scaleIndex !== -1) {
        notes.push({
          string: tuning.length - stringIndex, // 1-indexed, high string first
          fret,
          note: noteName,
          interval: getIntervalName(intervals[scaleIndex]),
          isRoot: intervals[scaleIndex] === 0,
        });
      }
    }
  });

  return notes;
}
