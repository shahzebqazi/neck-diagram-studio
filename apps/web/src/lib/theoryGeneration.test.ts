import { describe, expect, it } from "vitest";
import {
  DEFAULT_NECK_CONFIG,
  DEFAULT_TUNING_4,
  DEFAULT_TUNING_5,
  DEFAULT_TUNING_6,
  DEFAULT_TUNING_7,
  DEFAULT_TUNING_8,
  DEFAULT_TUNING_9,
  getStandardTuning
} from "../state/defaults";
import { DEFAULT_KEYS, DEFAULT_SCALES, DEFAULT_MODES, DEFAULT_POSITIONS } from "./libraryDefaults";

describe("DEFAULT_NECK_CONFIG", () => {
  it("defaults to 6 strings for standard guitar users", () => {
    expect(DEFAULT_NECK_CONFIG.strings).toBe(6);
    expect(DEFAULT_NECK_CONFIG.tuning).toEqual(DEFAULT_TUNING_6);
  });

  it("has 12 frets by default", () => {
    expect(DEFAULT_NECK_CONFIG.frets).toBe(12);
  });
});

describe("getStandardTuning", () => {
  it("returns correct tuning for 4 strings", () => {
    expect(getStandardTuning(4)).toEqual(DEFAULT_TUNING_4);
    expect(getStandardTuning(4)).toHaveLength(4);
  });

  it("returns correct tuning for 5 strings", () => {
    expect(getStandardTuning(5)).toEqual(DEFAULT_TUNING_5);
    expect(getStandardTuning(5)).toHaveLength(5);
  });

  it("returns correct tuning for 6 strings", () => {
    expect(getStandardTuning(6)).toEqual(DEFAULT_TUNING_6);
    expect(getStandardTuning(6)).toHaveLength(6);
  });

  it("returns correct tuning for 7 strings", () => {
    expect(getStandardTuning(7)).toEqual(DEFAULT_TUNING_7);
    expect(getStandardTuning(7)).toHaveLength(7);
  });

  it("returns correct tuning for 8 strings", () => {
    expect(getStandardTuning(8)).toEqual(DEFAULT_TUNING_8);
    expect(getStandardTuning(8)).toHaveLength(8);
  });

  it("returns correct tuning for 9 strings", () => {
    expect(getStandardTuning(9)).toEqual(DEFAULT_TUNING_9);
    expect(getStandardTuning(9)).toHaveLength(9);
  });

  it("pads tuning when requesting more strings than base", () => {
    const tuning = getStandardTuning(10);
    expect(tuning).toHaveLength(10);
    expect(tuning.slice(0, 9)).toEqual(DEFAULT_TUNING_9);
  });

  it("slices tuning when requesting fewer strings than base", () => {
    const tuning = getStandardTuning(3);
    expect(tuning).toHaveLength(3);
    expect(tuning).toEqual(DEFAULT_TUNING_6.slice(0, 3));
  });
});

describe("library defaults", () => {
  it("contains all 12 keys", () => {
    expect(DEFAULT_KEYS).toHaveLength(12);
    const names = DEFAULT_KEYS.map((k) => k.name);
    expect(names).toContain("C");
    expect(names).toContain("F#");
    expect(names).toContain("B");
  });

  it("key IDs follow the default:key:slug pattern", () => {
    for (const key of DEFAULT_KEYS) {
      expect(key.id).toMatch(/^default:key:/);
    }
  });

  it("contains major scales and modes", () => {
    const scaleNames = DEFAULT_SCALES.map((s) => s.name);
    expect(scaleNames).toContain("Major (Ionian)");
    expect(scaleNames).toContain("Natural Minor");
    expect(scaleNames).toContain("Harmonic Minor");
    expect(scaleNames).toContain("Minor Pentatonic");
    expect(scaleNames).toContain("Blues");

    const modeNames = DEFAULT_MODES.map((m) => m.name);
    expect(modeNames).toContain("Dorian");
    expect(modeNames).toContain("Phrygian");
    expect(modeNames).toContain("Lydian");
    expect(modeNames).toContain("Mixolydian");
    expect(modeNames).toContain("Locrian");
  });

  it("scales have interval arrays", () => {
    for (const scale of DEFAULT_SCALES) {
      expect(scale.intervals).toBeDefined();
      expect(Array.isArray(scale.intervals)).toBe(true);
      expect(scale.intervals!.length).toBeGreaterThan(0);
    }
  });

  it("contains positions 1-7 and range presets", () => {
    const names = DEFAULT_POSITIONS.map((p) => p.name);
    expect(names).toContain("Position 1");
    expect(names).toContain("Position 5");
    expect(names).toContain("Position 6");
    expect(names).toContain("Position 7");
    expect(names).toContain("1-12");
    expect(names).toContain("12-24");
    expect(names).toContain("12-27");
    expect(names).toContain("Whole Neck");
  });

  it("position IDs follow the default:position:slug pattern", () => {
    for (const pos of DEFAULT_POSITIONS) {
      expect(pos.id).toMatch(/^default:position:/);
    }
  });
});
