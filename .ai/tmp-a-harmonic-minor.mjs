import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseURL = "http://127.0.0.1:5174/app";

const NOTE_INDEX = {
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

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];

const noteNameToIndex = (name) => {
  if (!name) return null;
  const normalized = name.trim();
  return NOTE_INDEX[normalized] ?? null;
};

const getStandardTuning = (strings) => {
  const DEFAULT_TUNING_6 = ["E", "A", "D", "G", "B", "E"];
  const DEFAULT_TUNING_7 = ["B", "E", "A", "D", "G", "B", "E"];
  const DEFAULT_TUNING_8 = ["F#", "B", "E", "A", "D", "G", "B", "E"];
  const base = strings >= 8 ? DEFAULT_TUNING_8 : strings === 7 ? DEFAULT_TUNING_7 : DEFAULT_TUNING_6;
  if (strings <= base.length) return base.slice(0, strings);
  const normalized = [...base];
  while (normalized.length < strings) {
    normalized.push(normalized[normalized.length - 1] ?? "E");
  }
  return normalized;
};

const getNoteIndex = (tuning, stringIndex, fret, capo) => {
  const open = noteNameToIndex(tuning[stringIndex]);
  if (open === null) return null;
  const fretValue = fret < 0 ? 0 : fret + 1;
  return (open + fretValue + capo) % 12;
};

const getScaleMismatch = (diagram, rootName) => {
  const rootIndex = noteNameToIndex(rootName);
  if (rootIndex === null) return null;
  const scaleSet = new Set(HARMONIC_MINOR.map((interval) => (rootIndex + interval) % 12));
  const config = diagram?.config;
  if (!config) return null;
  const tuning = config.displayStandardTuning ? getStandardTuning(config.strings) : config.tuning;
  const outOfScale = [];
  for (const note of diagram.notes ?? []) {
    const noteIndex = getNoteIndex(tuning, note.stringIndex, note.fret, config.capo ?? 0);
    if (noteIndex === null) continue;
    if (!scaleSet.has(noteIndex)) {
      outOfScale.push({ stringIndex: note.stringIndex, fret: note.fret, noteIndex: NOTE_NAMES[noteIndex] });
    }
  }
  return outOfScale;
};

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".workspace");

  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("neck-diagram:sidebar-collapsed", "false");
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".workspace");

  const panelByTitle = (title) =>
    page.locator("section.panel", {
      has: page.locator(".panel-title", { hasText: title })
    });

  const theoryPanel = panelByTitle("Theory").first();
  const diagramPanel = panelByTitle("Diagram").first();

  const diagramToggle = diagramPanel.locator(".panel-toggle");
  const diagramExpanded = await diagramToggle.getAttribute("aria-expanded");
  if (diagramExpanded === "false") {
    await diagramToggle.click();
  }

  const theoryKeySelect = theoryPanel.getByLabel("Key");
  const theoryScaleSelect = theoryPanel.getByLabel("Scale/Mode");
  const theoryPositionSelect = theoryPanel.getByLabel("Position");

  await theoryKeySelect.selectOption({ label: "A" });
  await theoryScaleSelect.selectOption({ label: "Harmonic Minor" });
  await theoryPositionSelect.selectOption({ label: "Whole Neck" });

  await theoryPanel.getByRole("button", { name: /Create Diagram|Replace Diagram/ }).click();
  await page.waitForTimeout(1200);

  const project = await page.evaluate(() => {
    const raw = localStorage.getItem("neck-diagram:last-project");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const diagram = project?.data?.selectedDiagramId
    ? project?.data?.diagrams?.find((item) => item.id === project.data.selectedDiagramId)
    : project?.data?.diagrams?.[0];

  if (!diagram) {
    throw new Error("No diagram found after Create Diagram.");
  }

  const outOfScale = getScaleMismatch(diagram, "A") ?? [];
  if (outOfScale.length > 0) {
    throw new Error(`A Harmonic Minor mismatch: ${outOfScale.length} notes out of scale.`);
  }

  const exportPayload = {
    diagram,
    metadata: {
      key: "A",
      scale: "Harmonic Minor",
      position: "Whole Neck",
      generatedAt: new Date().toISOString()
    }
  };

  const outPath = path.resolve(process.cwd(), ".ai/a-harmonic-minor-whole-neck.json");
  fs.writeFileSync(outPath, JSON.stringify(exportPayload, null, 2), "utf8");

  await browser.close();
  return outPath;
};

run()
  .then((outPath) => {
    console.log(JSON.stringify({ ok: true, exportPath: outPath }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: String(error?.message ?? error) }, null, 2));
    process.exit(1);
  });
