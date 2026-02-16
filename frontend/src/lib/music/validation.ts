// =============================================================================
// Music Theory - Data Validation
// =============================================================================
// Validates scales, tunings, and other music data for correctness.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Scale {
  name: string;
  category: string;
  intervals: number[];
  notes?: string[];
  rootNote?: string;
  modeNumber?: number;
}

export interface Tuning {
  name: string;
  strings: number;
  notes: string[];
  category: string;
  instrument: string;
}

export interface ScaleShape {
  name: string;
  scaleId: string;
  category: string;
  startFret: number;
  pattern: FretboardNote[];
}

export interface FretboardNote {
  string: number;
  fret: number;
  interval: string;
  isRoot: boolean;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const VALID_NOTE_NAMES = new Set([
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 
  'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
]);

const VALID_SCALE_CATEGORIES = new Set([
  'major', 'harmonic', 'melodic', 'pentatonic', 'blues', 'symmetric', 'exotic'
]);

const VALID_TUNING_CATEGORIES = new Set([
  'standard', 'drop', 'open', 'bass', 'extended', 'alternate'
]);

const VALID_INSTRUMENTS = new Set([
  'guitar', 'bass', 'ukulele', 'mandolin', 'banjo'
]);

const VALID_SHAPE_CATEGORIES = new Set([
  'caged', '3nps', 'position', 'custom'
]);

const VALID_INTERVALS = new Set([
  'R', 'b2', '2', 'b3', '3', '4', 'b5', '#4', '5', '#5', 'b6', '6', 'bb7', 'b7', '7'
]);

// Known scale formulas for cross-validation
const KNOWN_SCALES: Record<string, number[]> = {
  'Ionian (Major)': [0, 2, 4, 5, 7, 9, 11],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Aeolian (Natural Minor)': [0, 2, 3, 5, 7, 8, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Major Pentatonic': [0, 2, 4, 7, 9],
  'Minor Pentatonic': [0, 3, 5, 7, 10],
  'Blues Minor': [0, 3, 5, 6, 7, 10],
  'Blues Major': [0, 2, 3, 4, 7, 9],
  'Whole Tone': [0, 2, 4, 6, 8, 10],
  'Diminished Half-Whole': [0, 1, 3, 4, 6, 7, 9, 10],
  'Diminished Whole-Half': [0, 2, 3, 5, 6, 8, 9, 11],
};

// -----------------------------------------------------------------------------
// Scale Validation
// -----------------------------------------------------------------------------

/**
 * Validates a scale's interval array
 */
export function validateIntervals(intervals: number[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if array exists and has content
  if (!intervals || !Array.isArray(intervals)) {
    errors.push('Intervals must be a non-empty array');
    return { valid: false, errors, warnings };
  }

  // Must start with root (0)
  if (intervals[0] !== 0) {
    errors.push('Scale must start with root (0)');
  }

  // All values must be 0-11
  const outOfRange = intervals.filter(i => i < 0 || i > 11);
  if (outOfRange.length > 0) {
    errors.push(`Intervals must be 0-11, found: ${outOfRange.join(', ')}`);
  }

  // Must be sorted ascending
  const sorted = [...intervals].sort((a, b) => a - b);
  if (!intervals.every((v, i) => v === sorted[i])) {
    errors.push('Intervals must be sorted in ascending order');
  }

  // No duplicates
  if (new Set(intervals).size !== intervals.length) {
    const duplicates = intervals.filter((item, index) => intervals.indexOf(item) !== index);
    errors.push(`Intervals must not have duplicates: ${Array.from(new Set(duplicates)).join(', ')}`);
  }

  // Valid length (5 for pentatonic to 12 for chromatic)
  if (intervals.length < 5) {
    errors.push(`Scale has only ${intervals.length} notes (minimum 5 for pentatonic)`);
  }
  if (intervals.length > 12) {
    errors.push(`Scale has ${intervals.length} notes (maximum 12 for chromatic)`);
  }

  // Warning for unusual scales
  if (intervals.length === 12 && !intervals.every((v, i) => v === i)) {
    warnings.push('12-note scale that is not chromatic');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates a complete scale object
 */
export function validateScale(scale: Scale): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  if (!scale.name || scale.name.trim().length === 0) {
    errors.push('Scale name is required');
  }

  // Validate category
  if (!VALID_SCALE_CATEGORIES.has(scale.category)) {
    errors.push(`Invalid category "${scale.category}". Must be one of: ${Array.from(VALID_SCALE_CATEGORIES).join(', ')}`);
  }

  // Validate intervals
  const intervalResult = validateIntervals(scale.intervals);
  errors.push(...intervalResult.errors);
  warnings.push(...intervalResult.warnings);

  // Validate mode number for modal categories
  if (['major', 'harmonic', 'melodic'].includes(scale.category)) {
    if (scale.modeNumber === undefined || scale.modeNumber === null) {
      errors.push('Mode number is required for major/harmonic/melodic categories');
    } else if (scale.modeNumber < 1 || scale.modeNumber > 7) {
      errors.push(`Mode number must be 1-7, got ${scale.modeNumber}`);
    }
  }

  // Validate notes array if provided
  if (scale.notes && scale.notes.length > 0) {
    if (scale.notes.length !== scale.intervals.length) {
      errors.push(`Notes array length (${scale.notes.length}) must match intervals length (${scale.intervals.length})`);
    }

    const invalidNotes = scale.notes.filter(n => !VALID_NOTE_NAMES.has(n));
    if (invalidNotes.length > 0) {
      errors.push(`Invalid note names: ${invalidNotes.join(', ')}`);
    }
  }

  // Validate root note if provided
  if (scale.rootNote && !VALID_NOTE_NAMES.has(scale.rootNote)) {
    errors.push(`Invalid root note "${scale.rootNote}"`);
  }

  // Cross-validate against known scales
  if (KNOWN_SCALES[scale.name]) {
    const expected = KNOWN_SCALES[scale.name];
    if (!arraysEqual(scale.intervals, expected)) {
      warnings.push(`Intervals don't match known formula for "${scale.name}". Expected: [${expected.join(',')}], got: [${scale.intervals.join(',')}]`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// -----------------------------------------------------------------------------
// Tuning Validation
// -----------------------------------------------------------------------------

/**
 * Validates a tuning object
 */
export function validateTuning(tuning: Tuning): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  if (!tuning.name || tuning.name.trim().length === 0) {
    errors.push('Tuning name is required');
  }

  // Validate string count
  if (tuning.strings < 4 || tuning.strings > 12) {
    errors.push(`String count must be 4-12, got ${tuning.strings}`);
  }

  // Validate notes array exists
  if (!tuning.notes || !Array.isArray(tuning.notes)) {
    errors.push('Notes must be a non-empty array');
    return { valid: false, errors, warnings };
  }

  // String count must match notes array
  if (tuning.strings !== tuning.notes.length) {
    errors.push(`String count (${tuning.strings}) doesn't match notes array length (${tuning.notes.length})`);
  }

  // Validate each note
  tuning.notes.forEach((note, i) => {
    if (!VALID_NOTE_NAMES.has(note)) {
      errors.push(`Invalid note "${note}" at string ${i + 1}`);
    }
  });

  // Validate category
  if (!VALID_TUNING_CATEGORIES.has(tuning.category)) {
    errors.push(`Invalid category "${tuning.category}". Must be one of: ${Array.from(VALID_TUNING_CATEGORIES).join(', ')}`);
  }

  // Validate instrument
  if (!VALID_INSTRUMENTS.has(tuning.instrument)) {
    errors.push(`Invalid instrument "${tuning.instrument}". Must be one of: ${Array.from(VALID_INSTRUMENTS).join(', ')}`);
  }

  // Warning for bass with guitar string count
  if (tuning.instrument === 'bass' && tuning.strings > 6) {
    warnings.push('Bass with more than 6 strings is unusual');
  }

  // Warning for guitar with less than 6 strings
  if (tuning.instrument === 'guitar' && tuning.strings < 6) {
    warnings.push('Guitar with less than 6 strings is unusual');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// -----------------------------------------------------------------------------
// Scale Shape Validation
// -----------------------------------------------------------------------------

/**
 * Validates a scale shape object
 */
export function validateScaleShape(shape: ScaleShape): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  if (!shape.name || shape.name.trim().length === 0) {
    errors.push('Shape name is required');
  }

  // Validate scale ID
  if (!shape.scaleId) {
    errors.push('Scale ID is required');
  }

  // Validate category
  if (!VALID_SHAPE_CATEGORIES.has(shape.category)) {
    errors.push(`Invalid category "${shape.category}". Must be one of: ${Array.from(VALID_SHAPE_CATEGORIES).join(', ')}`);
  }

  // Validate start fret
  if (shape.startFret < 0 || shape.startFret > 24) {
    errors.push(`Start fret must be 0-24, got ${shape.startFret}`);
  }

  // Validate pattern
  if (!shape.pattern || !Array.isArray(shape.pattern) || shape.pattern.length === 0) {
    errors.push('Pattern must be a non-empty array');
    return { valid: false, errors, warnings };
  }

  // Validate each note in pattern
  let hasRoot = false;
  shape.pattern.forEach((note, i) => {
    if (note.string < 1 || note.string > 12) {
      errors.push(`Invalid string number ${note.string} at pattern index ${i}`);
    }
    if (note.fret < 0 || note.fret > 24) {
      errors.push(`Invalid fret ${note.fret} at pattern index ${i}`);
    }
    if (!VALID_INTERVALS.has(note.interval)) {
      errors.push(`Invalid interval "${note.interval}" at pattern index ${i}`);
    }
    if (note.isRoot) {
      hasRoot = true;
    }
  });

  if (!hasRoot) {
    warnings.push('Pattern has no root note marked');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// -----------------------------------------------------------------------------
// Batch Validation
// -----------------------------------------------------------------------------

export interface BatchValidationResult {
  total: number;
  valid: number;
  invalid: number;
  percentValid: number;
  issues: Array<{
    index: number;
    name: string;
    errors: string[];
    warnings: string[];
  }>;
}

/**
 * Validates an array of scales
 */
export function validateScales(scales: Scale[]): BatchValidationResult {
  const issues: BatchValidationResult['issues'] = [];
  let valid = 0;

  scales.forEach((scale, index) => {
    const result = validateScale(scale);
    if (result.valid) {
      valid++;
    }
    if (result.errors.length > 0 || result.warnings.length > 0) {
      issues.push({
        index,
        name: scale.name,
        errors: result.errors,
        warnings: result.warnings,
      });
    }
  });

  return {
    total: scales.length,
    valid,
    invalid: scales.length - valid,
    percentValid: scales.length > 0 ? (valid / scales.length) * 100 : 100,
    issues,
  };
}

/**
 * Validates an array of tunings
 */
export function validateTunings(tunings: Tuning[]): BatchValidationResult {
  const issues: BatchValidationResult['issues'] = [];
  let valid = 0;

  tunings.forEach((tuning, index) => {
    const result = validateTuning(tuning);
    if (result.valid) {
      valid++;
    }
    if (result.errors.length > 0 || result.warnings.length > 0) {
      issues.push({
        index,
        name: tuning.name,
        errors: result.errors,
        warnings: result.warnings,
      });
    }
  });

  return {
    total: tunings.length,
    valid,
    invalid: tunings.length - valid,
    percentValid: tunings.length > 0 ? (valid / tunings.length) * 100 : 100,
    issues,
  };
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

/**
 * Generates a validation report as markdown
 */
export function generateValidationReport(
  scaleResults: BatchValidationResult,
  tuningResults: BatchValidationResult
): string {
  const now = new Date().toISOString();
  
  let report = `## Data Validation Report\n\n`;
  report += `**Date**: ${now}\n\n`;
  report += `### Summary\n\n`;
  report += `| Category | Total | Valid | Invalid | % Valid |\n`;
  report += `|----------|-------|-------|---------|--------|\n`;
  report += `| Scales | ${scaleResults.total} | ${scaleResults.valid} | ${scaleResults.invalid} | ${scaleResults.percentValid.toFixed(1)}% |\n`;
  report += `| Tunings | ${tuningResults.total} | ${tuningResults.valid} | ${tuningResults.invalid} | ${tuningResults.percentValid.toFixed(1)}% |\n`;
  report += `\n`;

  const allIssues = [
    ...scaleResults.issues.map(i => ({ ...i, type: 'Scale' })),
    ...tuningResults.issues.map(i => ({ ...i, type: 'Tuning' })),
  ];

  if (allIssues.length > 0) {
    report += `### Issues Found\n\n`;
    allIssues.forEach(issue => {
      report += `#### ${issue.type}: ${issue.name}\n`;
      if (issue.errors.length > 0) {
        report += `**Errors:**\n`;
        issue.errors.forEach(e => {
          report += `- ${e}\n`;
        });
      }
      if (issue.warnings.length > 0) {
        report += `**Warnings:**\n`;
        issue.warnings.forEach(w => {
          report += `- ${w}\n`;
        });
      }
      report += `\n`;
    });
  } else {
    report += `### No Issues Found\n\nAll data passes validation.\n`;
  }

  return report;
}
