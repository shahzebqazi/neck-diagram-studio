import { chromium } from 'playwright';

const baseURL = 'http://127.0.0.1:5173/app';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
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

const SCALE_INTERVALS = {
  "Major (Ionian)": [0, 2, 4, 5, 7, 9, 11],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11]
};

const noteNameToIndex = (name) => {
  if (!name) return null;
  const normalized = name.trim();
  return NOTE_INDEX[normalized] ?? null;
};

const getStandardTuning = (strings) => {
  const DEFAULT_TUNING_6 = ["E", "A", "D", "G", "B", "E"];
  const DEFAULT_TUNING_7 = ["B", "E", "A", "D", "G", "B", "E"];
  const DEFAULT_TUNING_8 = ["F#", "B", "E", "A", "D", "G", "B", "E"];
  const base =
    strings >= 8 ? DEFAULT_TUNING_8 : strings === 7 ? DEFAULT_TUNING_7 : DEFAULT_TUNING_6;
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

const getScaleMismatch = (diagram, rootName, scaleName) => {
  const intervals = SCALE_INTERVALS[scaleName];
  const rootIndex = noteNameToIndex(rootName);
  if (!intervals || rootIndex === null) return null;
  const scaleSet = new Set(intervals.map((interval) => (rootIndex + interval) % 12));
  const config = diagram?.config;
  if (!config) return null;
  const tuning = config.displayStandardTuning ? getStandardTuning(config.strings) : config.tuning;
  const outOfScale = [];
  for (const note of diagram.notes ?? []) {
    const noteIndex = getNoteIndex(tuning, note.stringIndex, note.fret, config.capo ?? 0);
    if (noteIndex === null) continue;
    if (!scaleSet.has(noteIndex)) {
      outOfScale.push({ stringIndex: note.stringIndex, fret: note.fret, noteIndex });
    }
  }
  return outOfScale;
};

const getProject = async (page) => {
  const raw = await page.evaluate(() => localStorage.getItem('neck-diagram:last-project'));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getSelectedDiagram = (project) => {
  if (!project?.data?.selectedDiagramId) return null;
  return (
    project.data.diagrams.find((diagram) => diagram.id === project.data.selectedDiagramId) ?? null
  );
};

const arraysEqual = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const selectOptionByIndex = async (selectLocator, index = 0) => {
  const options = await selectLocator.locator('option').all();
  const values = [];
  for (const opt of options) {
    const value = await opt.getAttribute('value');
    if (value) values.push(value);
  }
  if (values.length === 0) return null;
  const safeIndex = Math.min(index, values.length - 1);
  const value = values[safeIndex];
  await selectLocator.selectOption(value);
  return value;
};

const selectOptionByLabel = async (selectLocator, label) => {
  if (!label) return null;
  await selectLocator.selectOption({ label });
  return label;
};

const trySelectOptionByLabel = async (selectLocator, label) => {
  try {
    await selectLocator.selectOption({ label });
    return true;
  } catch {
    return false;
  }
};

const getNoteKeySet = (diagram) => {
  const notes = diagram?.notes ?? [];
  const sorted = notes
    .map((note) => `${note.stringIndex}:${note.fret}`)
    .sort();
  return sorted.join('|');
};

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  const findings = [];

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.workspace');

  // Reset state to reduce flakiness and ensure sidebar is visible.
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('neck-diagram:sidebar-collapsed', 'false');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace');

  const panelByTitle = (title) =>
    page.locator('section.panel', {
      has: page.locator('.panel-title', { hasText: title })
    });

  const theoryPanel = panelByTitle('Theory').first();
  const diagramPanel = panelByTitle('Diagram').first();
  const instrumentPanel = panelByTitle('Instrument').first();
  const settingsPanel = panelByTitle('Settings').first();

  const diagramToggle = diagramPanel.locator('.panel-toggle');
  const diagramExpanded = await diagramToggle.getAttribute('aria-expanded');
  if (diagramExpanded === 'false') {
    await diagramToggle.click();
  }

  const theoryKeySelect = theoryPanel.getByLabel('Key');
  const theoryScaleSelect = theoryPanel.getByLabel('Scale/Mode');
  const theoryPositionSelect = theoryPanel.getByLabel('Position');

  await page.waitForFunction(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      /Create Diagram|Replace Diagram/.test(b.textContent || '')
    );
    return !!btn && !btn.disabled;
  });

  const ensureSelected = async () => {
    const selectedCount = await page.locator('.neck-diagram.is-selected').count();
    if (selectedCount > 0) return true;
    await page.locator('.neck-diagram').first().click();
    await sleep(300);
    return (await page.locator('.neck-diagram.is-selected').count()) > 0;
  };

  const replaceFromTheory = async () => {
    await theoryPanel.getByRole('button', { name: /Replace Diagram|Create Diagram/ }).click();
    await sleep(1200);
    await ensureSelected();
    await sleep(400);
  };

  const key1 = await selectOptionByIndex(theoryKeySelect, 0);
  const scale1 = await selectOptionByIndex(theoryScaleSelect, 0);
  const position1 = await selectOptionByIndex(theoryPositionSelect, 0);

  await theoryPanel.getByRole('button', { name: /Create Diagram|Replace Diagram/ }).click();
  await page.waitForSelector('.diagram-wrapper');
  await sleep(1200);
  const isSelectedAfterCreate = await ensureSelected();

  const projectAfterCreate = await getProject(page);
  const diagramAfterCreate = projectAfterCreate?.data?.diagrams?.[0];
  const selectedIdAfterCreate = projectAfterCreate?.data?.selectedDiagramId;
  const baseNotes = diagramAfterCreate ? getNoteKeySet(diagramAfterCreate) : null;
  const baseNotesCount = diagramAfterCreate?.notes?.length ?? 0;
  let currentNotes = baseNotes;

  if (!isSelectedAfterCreate || !selectedIdAfterCreate) {
    findings.push({
      id: 'create-diagram-not-selected',
      detail: 'Create Diagram did not select the newly created diagram, so Diagram/Instrument panels stay empty.'
    });
  }

  if (!diagramAfterCreate) {
    findings.push({
      id: 'create-diagram',
      detail: 'Create Diagram did not persist a diagram to localStorage.'
    });
  }

  const notesAfterCreate = diagramAfterCreate?.notes ?? [];
  if (notesAfterCreate.length === 0) {
    findings.push({
      id: 'create-diagram-notes',
      detail: 'Theory Create Diagram produced zero notes.'
    });
  }

  const key2 = await selectOptionByIndex(theoryKeySelect, 1);
  const scale2 = await selectOptionByIndex(theoryScaleSelect, 1);
  const position2 = await selectOptionByIndex(theoryPositionSelect, 1);

  await theoryPanel.getByRole('button', { name: /Replace Diagram|Create Diagram/ }).click();
  await sleep(1200);
  await ensureSelected();
  await sleep(400);

  const projectAfterReplace = await getProject(page);
  const diagramAfterReplace = projectAfterReplace?.data?.diagrams?.[0];

  if (diagramAfterReplace && diagramAfterCreate) {
    const nameChanged = diagramAfterCreate.name !== diagramAfterReplace.name;
    if (!nameChanged) {
      findings.push({
        id: 'replace-name',
        detail: 'Replace Diagram did not update the diagram name after changing theory selection.'
      });
    }

    const notesBefore = getNoteKeySet(diagramAfterCreate);
    const notesAfter = getNoteKeySet(diagramAfterReplace);
    if (notesBefore === notesAfter && (key1 !== key2 || scale1 !== scale2 || position1 !== position2)) {
      findings.push({
        id: 'replace-notes',
        detail: 'Replace Diagram did not change the note set after changing theory selection.'
      });
    }
  }

  // Change strings to 4 and check for out-of-range notes.
  let didChangeStrings = false;
  const stringsInput = instrumentPanel.getByLabel('Strings');
  const stringsVisible = await stringsInput.isVisible().catch(() => false);
  if (!stringsVisible) {
    findings.push({
      id: 'instrument-panel-missing',
      detail: 'Instrument panel controls (Strings/Tuning) never became visible after creating/selecting a diagram.'
    });
  } else {
    await stringsInput.fill('4');
    await stringsInput.press('Enter');
    await stringsInput.blur();
    await sleep(900);
    didChangeStrings = true;
  }

  if (didChangeStrings) {
    const projectAfterStrings = await getProject(page);
    const diagramAfterStrings = projectAfterStrings?.data?.diagrams?.[0];
    if (diagramAfterStrings) {
      const stringCount = diagramAfterStrings.config?.strings ?? 0;
      const outOfRangeStrings = (diagramAfterStrings.notes ?? []).filter(
        (note) => note.stringIndex >= stringCount
      );
      if (outOfRangeStrings.length > 0) {
        findings.push({
          id: 'strings-out-of-range',
          detail: `After changing strings to ${stringCount}, ${outOfRangeStrings.length} notes still reference removed strings (stringIndex >= ${stringCount}).`
        });
      }
    }
  }

  // Change frets to 5 and check for out-of-range notes.
  let didChangeFrets = false;
  const hasSelectedForFrets = await ensureSelected();
  if (!hasSelectedForFrets) {
    findings.push({
      id: 'diagram-selection-missing',
      detail: 'Diagram could not be selected in the canvas; Diagram panel stayed empty.'
    });
  }
  const fretsInput = diagramPanel.getByLabel('Frets');
  let fretsVisible = await fretsInput.isVisible().catch(() => false);
  if (!fretsVisible) {
    await diagramPanel.scrollIntoViewIfNeeded().catch(() => {});
    const diagramToggle = diagramPanel.locator('.panel-toggle');
    const expanded = await diagramToggle.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await diagramToggle.click();
      await sleep(300);
    }
    fretsVisible = await fretsInput.isVisible().catch(() => false);
  }
  if (!fretsVisible) {
    const panelBodyClass = await diagramPanel.locator('.panel-body').getAttribute('class');
    const expandedState = await diagramPanel.locator('.panel-toggle').getAttribute('aria-expanded');
    const panelBodyText = await diagramPanel.locator('.panel-body').innerText().catch(() => '');
    const fretsLabelCount = await diagramPanel.locator('label:has-text("Frets")').count();
    const fretsInputCount = await diagramPanel.locator('label:has-text("Frets") input').count();
    findings.push({
      id: 'diagram-panel-missing',
      detail: `Diagram panel controls (Frets) never became visible after creating/selecting a diagram. panel-body=${panelBodyClass ?? 'null'} aria-expanded=${expandedState ?? 'null'} fretsLabels=${fretsLabelCount} fretsInputs=${fretsInputCount} text="${panelBodyText.replace(/\\s+/g, ' ').trim().slice(0, 120)}".`
    });
  } else {
    await fretsInput.fill('5');
    await fretsInput.press('Enter');
    await fretsInput.blur();
    await sleep(900);
    didChangeFrets = true;
  }

  if (didChangeFrets) {
    const projectAfterFrets = await getProject(page);
    const diagramAfterFrets = projectAfterFrets?.data?.diagrams?.[0];
    if (diagramAfterFrets) {
      const fretCount = diagramAfterFrets.config?.frets ?? 0;
      const outOfRangeFrets = (diagramAfterFrets.notes ?? []).filter(
        (note) => note.fret >= fretCount
      );
      if (outOfRangeFrets.length > 0) {
        findings.push({
          id: 'frets-out-of-range',
          detail: `After changing frets to ${fretCount}, ${outOfRangeFrets.length} notes still reference frets >= ${fretCount}.`
        });
      }
    }
  }

  // Change tuning and check whether theory notes regenerate (they should change for most scales).
  const tuningInput = instrumentPanel.getByLabel('Tuning (comma-separated)');
  const tuningVisible = await tuningInput.isVisible().catch(() => false);
  if (tuningVisible) {
    const beforeTuningNotes = currentNotes;

    await tuningInput.fill('D, G, B, E');
    await tuningInput.press('Enter');
    await tuningInput.blur();
    await sleep(900);

    const afterTuningProject = await getProject(page);
    const afterTuningDiagram = afterTuningProject?.data?.diagrams?.[0];
    const afterTuningNotes = afterTuningDiagram ? getNoteKeySet(afterTuningDiagram) : null;
    if (beforeTuningNotes && afterTuningNotes && beforeTuningNotes === afterTuningNotes) {
      findings.push({
        id: 'tuning-stale-notes',
        detail: 'Changing tuning did not regenerate theory notes; note positions stayed identical.'
      });
    }
    if (afterTuningNotes) {
      currentNotes = afterTuningNotes;
    }
  }

  // Change key/scale/position in Diagram panel and check if notes stay identical.
  const diagramKeySelect = diagramPanel.getByLabel('Key');
  const diagramScaleSelect = diagramPanel.getByLabel('Scale/Mode');
  const diagramPositionSelect = diagramPanel.getByLabel('Position');

  const diagramKeyVisible = await diagramKeySelect.isVisible().catch(() => false);
  const diagramScaleVisible = await diagramScaleSelect.isVisible().catch(() => false);
  const diagramPositionVisible = await diagramPositionSelect.isVisible().catch(() => false);

  if (!diagramKeyVisible || !diagramScaleVisible || !diagramPositionVisible) {
    findings.push({
      id: 'diagram-panel-theory-missing',
      detail: 'Diagram panel theory selectors (Key/Scale/Position) were not visible, so per-diagram theory edits could not be tested.'
    });
  } else {
    await selectOptionByIndex(diagramKeySelect, 1);
    await selectOptionByIndex(diagramScaleSelect, 1);
    await selectOptionByIndex(diagramPositionSelect, 1);
    await sleep(900);

    const afterDiagramTheoryProject = await getProject(page);
    const afterDiagramTheoryDiagram = afterDiagramTheoryProject?.data?.diagrams?.[0];
    const afterDiagramTheoryNotes = afterDiagramTheoryDiagram
      ? getNoteKeySet(afterDiagramTheoryDiagram)
      : null;
  if (currentNotes && afterDiagramTheoryNotes && currentNotes === afterDiagramTheoryNotes) {
      findings.push({
        id: 'diagram-theory-stale-notes',
        detail: 'Changing key/scale/position in the Diagram panel did not regenerate notes (note positions stayed identical).'
      });
    }
    if (afterDiagramTheoryNotes) {
      currentNotes = afterDiagramTheoryNotes;
    }
  }

  // Deep theory checks: validate scale membership and root alignment.
  const wholeNeckSelected = await trySelectOptionByLabel(theoryPositionSelect, 'Whole Neck');
  if (!wholeNeckSelected) {
    findings.push({
      id: 'theory-position-missing',
      detail: 'Theory position option "Whole Neck" was not available in the dropdown.'
    });
  }

  const gKeySelected = await trySelectOptionByLabel(theoryKeySelect, 'G');
  const majorSelected = await trySelectOptionByLabel(theoryScaleSelect, 'Major (Ionian)');
  if (gKeySelected && majorSelected) {
    const beforeProject = await getProject(page);
    const beforeDiagram = beforeProject?.data?.diagrams?.[0];
    const beforeGeom = beforeDiagram
      ? { x: beforeDiagram.x, y: beforeDiagram.y, width: beforeDiagram.width, height: beforeDiagram.height }
      : null;

    await replaceFromTheory();
    const gProject = await getProject(page);
    const gDiagram = gProject?.data?.diagrams?.[0];

    if (beforeGeom && gDiagram) {
      const geomChanged =
        beforeGeom.x !== gDiagram.x ||
        beforeGeom.y !== gDiagram.y ||
        beforeGeom.width !== gDiagram.width ||
        beforeGeom.height !== gDiagram.height;
      if (geomChanged) {
        findings.push({
          id: 'replace-geometry-changed',
          detail: 'Replace Diagram changed the diagram position or size; expected geometry to be preserved.'
        });
      }
    }

    if (gDiagram) {
      const outOfScale = getScaleMismatch(gDiagram, 'G', 'Major (Ionian)') ?? [];
      if (outOfScale.length > 0) {
        const outOfScaleAlt = getScaleMismatch(gDiagram, 'G#', 'Major (Ionian)') ?? [];
        if (outOfScaleAlt.length === 0) {
          findings.push({
            id: 'g-major-shifted',
            detail: 'Selecting G Major produced notes consistent with G# Major (scale appears shifted +1 semitone).'
          });
        } else {
          findings.push({
            id: 'g-major-out-of-scale',
            detail: `Selecting G Major produced ${outOfScale.length} notes outside the G Major scale.`
          });
        }
      }
    }
  } else {
    findings.push({
      id: 'theory-g-major-missing',
      detail: 'Could not select G and/or Major (Ionian) in the Theory panel.'
    });
  }

  const aKeySelected = await trySelectOptionByLabel(theoryKeySelect, 'A');
  const harmonicSelected = await trySelectOptionByLabel(theoryScaleSelect, 'Harmonic Minor');
  if (aKeySelected && harmonicSelected) {
    await replaceFromTheory();
    const aProject = await getProject(page);
    const aDiagram = aProject?.data?.diagrams?.[0];
    if (aDiagram) {
      const outOfScale = getScaleMismatch(aDiagram, 'A', 'Harmonic Minor') ?? [];
      if (outOfScale.length > 0) {
        const outOfScaleAlt = getScaleMismatch(aDiagram, 'A#', 'Harmonic Minor') ?? [];
        if (outOfScaleAlt.length === 0) {
          findings.push({
            id: 'a-harmonic-minor-shifted',
            detail: 'Selecting A Harmonic Minor produced notes consistent with A# Harmonic Minor (scale appears shifted +1 semitone).'
          });
        } else {
          findings.push({
            id: 'a-harmonic-minor-out-of-scale',
            detail: `Selecting A Harmonic Minor produced ${outOfScale.length} notes outside the A Harmonic Minor scale.`
          });
        }
      }
    }
  } else {
    findings.push({
      id: 'theory-a-harmonic-minor-missing',
      detail: 'Could not select A and/or Harmonic Minor in the Theory panel.'
    });
  }

  const position1Selected = await trySelectOptionByLabel(theoryPositionSelect, 'Position 1');
  if (position1Selected) {
    await replaceFromTheory();
    const posProject = await getProject(page);
    const posDiagram = posProject?.data?.diagrams?.[0];
    if (posDiagram) {
      const outOfRange = (posDiagram.notes ?? []).filter((note) => {
        const fretValue = note.fret < 0 ? 0 : note.fret;
        return fretValue < 0 || fretValue > 4;
      });
      if (outOfRange.length > 0) {
        findings.push({
          id: 'position-1-out-of-range',
          detail: `Position 1 selected but ${outOfRange.length} notes fall outside frets 0-4.`
        });
      }
    }
  } else {
    findings.push({
      id: 'theory-position-1-missing',
      detail: 'Theory position option "Position 1" was not available in the dropdown.'
    });
  }

  // Diagram flow checks
  const getActiveTabDiagrams = (project) => {
    if (!project?.data?.activeTabId) return [];
    return project.data.diagrams.filter((diagram) => diagram.tabId === project.data.activeTabId);
  };

  const selectDiagramById = async (diagramId) => {
    if (!diagramId) return false;
    const locator = page.locator(`[data-diagram-wrapper="${diagramId}"] .neck-diagram`);
    if ((await locator.count()) === 0) return false;
    await locator.click();
    await sleep(400);
    return (await page.locator('.neck-diagram.is-selected').count()) > 0;
  };

  const addNeckButton = page.getByRole('button', { name: 'Add Neck' });
  const beforeAddProject = await getProject(page);
  const beforeAddCount = getActiveTabDiagrams(beforeAddProject).length;
  await addNeckButton.click();
  await sleep(1200);
  const afterAddProject = await getProject(page);
  const afterAddDiagrams = getActiveTabDiagrams(afterAddProject);
  if (afterAddDiagrams.length !== beforeAddCount + 1) {
    findings.push({
      id: 'add-neck-count',
      detail: `Add Neck did not increase diagram count (before=${beforeAddCount}, after=${afterAddDiagrams.length}).`
    });
  }
  const selectedAfterAdd = getSelectedDiagram(afterAddProject);
  if (!selectedAfterAdd) {
    findings.push({
      id: 'add-neck-not-selected',
      detail: 'Add Neck did not select the newly created diagram.'
    });
  }

  await ensureSelected();

  // Rename diagram via Diagram panel
  const nameInput = diagramPanel.getByLabel('Name');
  const nameVisible = await nameInput.isVisible().catch(() => false);
  if (!nameVisible) {
    findings.push({
      id: 'diagram-name-missing',
      detail: 'Diagram Name input was not visible in the Diagram panel.'
    });
  } else {
    await nameInput.fill('Diagram Flow Test');
    await sleep(800);
    const nameProject = await getProject(page);
    const nameDiagram = getSelectedDiagram(nameProject);
    if (nameDiagram?.name !== 'Diagram Flow Test') {
      findings.push({
        id: 'diagram-name-not-updated',
        detail: `Editing Diagram Name did not persist (value="${nameDiagram?.name ?? 'null'}").`
      });
    }
  }

  // Layout toggle
  const layoutSelect = diagramPanel.getByLabel('Layout');
  const layoutVisible = await layoutSelect.isVisible().catch(() => false);
  if (layoutVisible) {
    await layoutSelect.selectOption('float');
    await sleep(1200);
    const layoutProject = await getProject(page);
    const layoutDiagram = getSelectedDiagram(layoutProject);
    if (layoutDiagram?.layoutMode !== 'float') {
      findings.push({
        id: 'layout-float-not-applied',
        detail: `Selecting Floating layout did not update layoutMode (value="${layoutDiagram?.layoutMode ?? 'null'}").`
      });
    }
    await layoutSelect.selectOption('grid');
    await sleep(1200);
    const gridProject = await getProject(page);
    const gridDiagram = getSelectedDiagram(gridProject);
    if (gridDiagram?.layoutMode !== 'grid') {
      findings.push({
        id: 'layout-grid-not-applied',
        detail: `Selecting Grid layout did not update layoutMode (value="${gridDiagram?.layoutMode ?? 'null'}").`
      });
    }
  } else {
    findings.push({
      id: 'layout-select-missing',
      detail: 'Layout selector was not visible in the Diagram panel.'
    });
  }

  // Label mode dropdown
  const modeButton = diagramPanel.getByRole('button', { name: 'Mode' });
  let modeVisible = await modeButton.isVisible().catch(() => false);
  if (!modeVisible) {
    await ensureSelected();
    modeVisible = await modeButton.isVisible().catch(() => false);
  }
  if (modeVisible) {
    const openModeMenu = async () => {
      try {
        await page.keyboard.press('Escape').catch(() => {});
        await modeButton.scrollIntoViewIfNeeded().catch(() => {});
        await modeButton.click({ timeout: 5000 });
        await sleep(200);
        return true;
      } catch {
        findings.push({
          id: 'label-mode-button-not-clickable',
          detail: 'Mode dropdown button was present but could not be clicked (possibly covered or not visible).'
        });
        return false;
      }
    };

    const openedInterval = await openModeMenu();
    if (!openedInterval) {
      // Skip label mode checks if we cannot open the menu.
    } else {
    const intervalOption = page.getByRole('menuitemradio', { name: 'Interval' });
    if ((await intervalOption.count()) === 0) {
      findings.push({
        id: 'label-mode-interval-missing',
        detail: 'Interval mode option was not available in the Mode dropdown.'
      });
    } else {
      await intervalOption.click();
    }
    await sleep(1200);
    const modeProject = await getProject(page);
    const modeDiagram = getSelectedDiagram(modeProject);
    if (modeDiagram?.labelMode !== 'interval') {
      findings.push({
        id: 'label-mode-interval-not-applied',
        detail: `Selecting Interval mode did not update labelMode (value="${modeDiagram?.labelMode ?? 'null'}").`
      });
    }
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(200);

    const openedPicking = await openModeMenu();
    if (openedPicking) {
      const pickingOption = page.getByRole('menuitemradio', { name: 'Picking' });
      if ((await pickingOption.count()) === 0) {
        await openModeMenu();
        if ((await pickingOption.count()) === 0) {
          findings.push({
            id: 'label-mode-picking-missing',
            detail: 'Picking mode option was not available in the Mode dropdown.'
          });
        }
      } else {
        await pickingOption.click();
      }
      await sleep(1200);
      const pickingProject = await getProject(page);
      const pickingDiagram = getSelectedDiagram(pickingProject);
      if (pickingDiagram?.labelMode !== 'picking') {
        findings.push({
          id: 'label-mode-picking-not-applied',
          detail: `Selecting Picking mode did not update labelMode (value="${pickingDiagram?.labelMode ?? 'null'}").`
        });
      }
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(200);
    }
    }
  } else {
    findings.push({
      id: 'label-mode-missing',
      detail: 'Mode dropdown button was not visible in the Diagram panel.'
    });
  }

  // Frets and Capo updates
  if (layoutVisible) {
    const fretsInput = diagramPanel.getByLabel('Frets');
    if (await fretsInput.isVisible().catch(() => false)) {
      await fretsInput.fill('7');
      await fretsInput.press('Enter');
      await fretsInput.blur();
      await sleep(1200);
      const fretsProject = await getProject(page);
      const fretsDiagram = getSelectedDiagram(fretsProject);
      if (fretsDiagram?.config?.frets !== 7) {
        findings.push({
          id: 'frets-not-updated',
          detail: `Frets input did not update config (value="${fretsDiagram?.config?.frets ?? 'null'}").`
        });
      }
    }

    const capoInput = diagramPanel.getByLabel('Capo');
    if (await capoInput.isVisible().catch(() => false)) {
      await capoInput.fill('2');
      await capoInput.press('Enter');
      await capoInput.blur();
      await sleep(1200);
      const capoProject = await getProject(page);
      const capoDiagram = getSelectedDiagram(capoProject);
      if (capoDiagram?.config?.capo !== 2) {
        findings.push({
          id: 'capo-not-updated',
          detail: `Capo input did not update config (value="${capoDiagram?.config?.capo ?? 'null'}").`
        });
      }
    }
  }

  // Diagram checkboxes
  const highlightRootToggle = diagramPanel.getByLabel('Highlight Root Note');
  if (await highlightRootToggle.isVisible().catch(() => false)) {
    await highlightRootToggle.click();
    await sleep(1200);
    const highlightProject = await getProject(page);
    const highlightDiagram = getSelectedDiagram(highlightProject);
    if (highlightDiagram?.config?.highlightRoot !== false) {
      findings.push({
        id: 'highlight-root-toggle-failed',
        detail: `Highlight Root toggle did not update config (value="${highlightDiagram?.config?.highlightRoot ?? 'null'}").`
      });
    }
  }

  const showFretNumbersToggle = diagramPanel.getByLabel('Show Fret Numbers');
  if (await showFretNumbersToggle.isVisible().catch(() => false)) {
    await showFretNumbersToggle.click();
    await sleep(1200);
    const fretNumbersProject = await getProject(page);
    const fretNumbersDiagram = getSelectedDiagram(fretNumbersProject);
    if (fretNumbersDiagram?.config?.showFretNumbers !== true) {
      findings.push({
        id: 'show-fret-numbers-toggle-failed',
        detail: `Show Fret Numbers toggle did not update config (value="${fretNumbersDiagram?.config?.showFretNumbers ?? 'null'}").`
      });
    }
  }

  // Instrument panel: strings and tuning update
  const stringsInput2 = instrumentPanel.getByLabel('Strings');
  if (await stringsInput2.isVisible().catch(() => false)) {
    await stringsInput2.fill('6');
    await stringsInput2.press('Enter');
    await stringsInput2.blur();
    await sleep(1200);
    const stringsProject = await getProject(page);
    const stringsDiagram = getSelectedDiagram(stringsProject);
    if (stringsDiagram?.config?.strings !== 6) {
      findings.push({
        id: 'strings-not-updated',
        detail: `Strings input did not update config (value="${stringsDiagram?.config?.strings ?? 'null'}").`
      });
    }
  }

  const tuningInput2 = instrumentPanel.getByLabel('Tuning (comma-separated)');
  if (await tuningInput2.isVisible().catch(() => false)) {
    await tuningInput2.fill('D, G, B, E, A, D');
    await tuningInput2.press('Enter');
    await tuningInput2.blur();
    await sleep(1200);
    const tuningProject = await getProject(page);
    const tuningDiagram = getSelectedDiagram(tuningProject);
    const tuningValue = tuningDiagram?.config?.tuning ?? [];
    if (tuningValue.length !== 6) {
      findings.push({
        id: 'tuning-length-mismatch',
        detail: `Tuning update did not normalize to 6 strings (length=${tuningValue.length}).`
      });
    }
  }

  // Instrument flow: 8-string presets and tuning normalization.
  const eightStringPresets = [
    {
      label: 'F# Standard',
      tuning: ['F#', 'B', 'E', 'A', 'D', 'G', 'B', 'E']
    },
    {
      label: 'Half Step Down',
      tuning: ['F', 'A#', 'D#', 'G#', 'C#', 'F#', 'A#', 'D#']
    },
    {
      label: 'Drop E',
      tuning: ['E', 'B', 'E', 'A', 'D', 'G', 'B', 'E']
    },
    {
      label: 'E Standard',
      tuning: ['E', 'A', 'D', 'G', 'C', 'F', 'A', 'D']
    }
  ];

  if (await stringsInput2.isVisible().catch(() => false)) {
    await stringsInput2.fill('8');
    await stringsInput2.press('Enter');
    await stringsInput2.blur();
    await sleep(1200);
    const strings8Project = await getProject(page);
    const strings8Diagram = getSelectedDiagram(strings8Project);
    if (strings8Diagram?.config?.strings !== 8) {
      findings.push({
        id: 'strings-8-not-applied',
        detail: `Setting strings to 8 did not update config (value="${strings8Diagram?.config?.strings ?? 'null'}").`
      });
    }

    const presetButtons = instrumentPanel.locator('.preset-button');
    const presetCount = await presetButtons.count();
    if (presetCount === 0) {
      findings.push({
        id: 'eight-string-presets-missing',
        detail: '8-string presets were not visible after setting strings to 8.'
      });
    } else {
      for (const preset of eightStringPresets) {
        await instrumentPanel.getByRole('button', { name: preset.label }).click();
        await sleep(1200);
        const presetProject = await getProject(page);
        const presetDiagram = getSelectedDiagram(presetProject);
        if (!arraysEqual(presetDiagram?.config?.tuning ?? [], preset.tuning)) {
          findings.push({
            id: `preset-${preset.label.toLowerCase().replace(/\\s+/g, '-')}-mismatch`,
            detail: `8-string preset "${preset.label}" did not apply expected tuning.`
          });
        }
      }
    }

    // Lowercase + flat normalization
    await tuningInput2.fill('eb, ab, db, gb, bb, eb, ab, db');
    await tuningInput2.press('Enter');
    await tuningInput2.blur();
    await sleep(1200);
    const flatProject = await getProject(page);
    const flatDiagram = getSelectedDiagram(flatProject);
    const flatTuning = flatDiagram?.config?.tuning ?? [];
    const expectedFlats = ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb', 'Ab', 'Db'];
    if (!arraysEqual(flatTuning, expectedFlats)) {
      findings.push({
        id: 'tuning-normalization-failed',
        detail: 'Lowercase/flat tuning input did not normalize (expected Eb/Ab/Db/Gb/Bb...).'
      });
    }

    // Reduce strings and confirm presets hidden + tuning length normalized
    await stringsInput2.fill('6');
    await stringsInput2.press('Enter');
    await stringsInput2.blur();
    await sleep(1200);
    const strings6Project = await getProject(page);
    const strings6Diagram = getSelectedDiagram(strings6Project);
    if (strings6Diagram?.config?.strings !== 6) {
      findings.push({
        id: 'strings-6-not-applied',
        detail: `Setting strings to 6 did not update config (value="${strings6Diagram?.config?.strings ?? 'null'}").`
      });
    }
    const presetCountAfter = await instrumentPanel.locator('.preset-button').count();
    if (presetCountAfter > 0) {
      findings.push({
        id: 'eight-string-presets-still-visible',
        detail: '8-string presets remained visible after reducing strings below 8.'
      });
    }
    const tuningAfter = strings6Diagram?.config?.tuning ?? [];
    if (tuningAfter.length !== 6) {
      findings.push({
        id: 'tuning-length-after-strings',
        detail: `Tuning did not normalize to 6 notes after reducing strings (length=${tuningAfter.length}).`
      });
    }
  }

  // Settings panel: Note Display (displayStandardTuning) and other toggles
  const settingsToggle = settingsPanel.locator('.panel-toggle');
  const settingsExpanded = await settingsToggle.getAttribute('aria-expanded');
  if (settingsExpanded === 'false') {
    await settingsToggle.click();
    await sleep(300);
  }

  const noteDisplaySelect = settingsPanel.getByLabel('Note Display');
  if (await noteDisplaySelect.isVisible().catch(() => false)) {
    await noteDisplaySelect.selectOption('standard');
    await sleep(1200);
    const displayProject = await getProject(page);
    const displayDiagrams = getActiveTabDiagrams(displayProject);
    const anyNotStandard = displayDiagrams.some(
      (diagram) => diagram.config?.displayStandardTuning !== true
    );
    if (anyNotStandard) {
      findings.push({
        id: 'note-display-not-applied',
        detail: 'Note Display set to Standard did not apply to all diagrams in the active tab.'
      });
    }

    await noteDisplaySelect.selectOption('tuning');
    await sleep(1200);
    const tuningProject = await getProject(page);
    const tuningDiagrams = getActiveTabDiagrams(tuningProject);
    const anyNotTuning = tuningDiagrams.some(
      (diagram) => diagram.config?.displayStandardTuning !== false
    );
    if (anyNotTuning) {
      findings.push({
        id: 'note-display-not-reverted',
        detail: 'Note Display set to Tuning did not reset displayStandardTuning across the active tab.'
      });
    }
  }

  const fretStyleSelect = settingsPanel.getByLabel('Fret Numbers');
  if (await fretStyleSelect.isVisible().catch(() => false)) {
    await fretStyleSelect.selectOption('roman');
    await sleep(1200);
    const fretStyleProject = await getProject(page);
    const fretStyleDiagram = getSelectedDiagram(fretStyleProject);
    if (fretStyleDiagram?.config?.fretNumberStyle !== 'roman') {
      findings.push({
        id: 'fret-style-not-updated',
        detail: `Fret number style did not update to roman (value="${fretStyleDiagram?.config?.fretNumberStyle ?? 'null'}").`
      });
    }
  }

  const snapToggle = settingsPanel.getByLabel('Snap to Grid');
  if (await snapToggle.isVisible().catch(() => false)) {
    await snapToggle.click();
    await sleep(1200);
    const snapProject = await getProject(page);
    const snapDiagram = getSelectedDiagram(snapProject);
    if (snapDiagram?.config?.snapToGrid !== true) {
      findings.push({
        id: 'snap-to-grid-toggle-failed',
        detail: `Snap to Grid toggle did not update config (value="${snapDiagram?.config?.snapToGrid ?? 'null'}").`
      });
    }
  }

  const inlaysToggle = settingsPanel.getByLabel('Show Inlays');
  if (await inlaysToggle.isVisible().catch(() => false)) {
    await inlaysToggle.click();
    await sleep(1200);
    const inlaysProject = await getProject(page);
    const inlaysDiagram = getSelectedDiagram(inlaysProject);
    if (inlaysDiagram?.config?.showInlays !== false) {
      findings.push({
        id: 'show-inlays-toggle-failed',
        detail: `Show Inlays toggle did not update config (value="${inlaysDiagram?.config?.showInlays ?? 'null'}").`
      });
    }
  }

  // Settings flow: ensure toggles only affect selected diagram when expected.
  const settingsProject = await getProject(page);
  const activeDiagrams = getActiveTabDiagrams(settingsProject);
  if (activeDiagrams.length >= 2) {
    const first = activeDiagrams[0];
    const second = activeDiagrams[1];
    await selectDiagramById(first.id);
    await sleep(400);

    if (await inlaysToggle.isVisible().catch(() => false)) {
      await inlaysToggle.click();
      await sleep(1200);
      const afterInlaysProject = await getProject(page);
      const afterInlaysFirst = afterInlaysProject?.data?.diagrams?.find((d) => d.id === first.id);
      const afterInlaysSecond = afterInlaysProject?.data?.diagrams?.find((d) => d.id === second.id);
      if (afterInlaysFirst?.config?.showInlays !== false) {
        findings.push({
          id: 'show-inlays-not-updated-selected',
          detail: 'Show Inlays toggle did not update the selected diagram.'
        });
      }
      if (afterInlaysSecond?.config?.showInlays === false) {
        findings.push({
          id: 'show-inlays-updated-nonselected',
          detail: 'Show Inlays toggle affected a non-selected diagram.'
        });
      }
    }
  }

  // Preferences toggles persistence
  const deleteWarningToggle = settingsPanel.getByLabel('Delete Warning');
  if (await deleteWarningToggle.isVisible().catch(() => false)) {
    await deleteWarningToggle.click();
    await sleep(400);
    const deleteWarningValue = await page.evaluate(() =>
      localStorage.getItem('neck-diagram:delete-warning')
    );
    if (deleteWarningValue !== 'false' && deleteWarningValue !== 'true') {
      findings.push({
        id: 'delete-warning-storage-missing',
        detail: `Delete Warning toggle did not write to localStorage (value="${deleteWarningValue}").`
      });
    }
  }

  const showPageDateToggle = settingsPanel.getByLabel('Show Page Date');
  if (await showPageDateToggle.isVisible().catch(() => false)) {
    await showPageDateToggle.click();
    await sleep(400);
    const pageDateValue = await page.evaluate(() =>
      localStorage.getItem('neck-diagram:page-date')
    );
    if (pageDateValue !== 'false' && pageDateValue !== 'true') {
      findings.push({
        id: 'page-date-storage-missing',
        detail: `Show Page Date toggle did not write to localStorage (value="${pageDateValue}").`
      });
    }
  }

  // Theme selection persistence
  const themeButton = settingsPanel.getByRole('button', { name: 'OLED Blackout' });
  if (await themeButton.isVisible().catch(() => false)) {
    await themeButton.click();
    await sleep(400);
    const themeValue = await page.evaluate(() => localStorage.getItem('neck-diagram:theme'));
    if (themeValue !== 'oled-blackout') {
      findings.push({
        id: 'theme-storage-mismatch',
        detail: `Theme selection did not persist to localStorage (value="${themeValue}").`
      });
    }
  }

  // Picking mode note toggle cycle
  const pickingCheckProject = await getProject(page);
  const pickingCheckDiagram = getSelectedDiagram(pickingCheckProject);
  if (pickingCheckDiagram?.labelMode === 'picking') {
    const svg = page.locator('svg.neck-diagram-svg').first();
    const box = await svg.boundingBox();
    if (box) {
      const beforeProject = await getProject(page);
      const beforeDiagram = getSelectedDiagram(beforeProject);
      const beforeNotes = beforeDiagram?.notes ?? [];
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
      await sleep(1200);
      const afterAddProject = await getProject(page);
      const afterAddDiagram = getSelectedDiagram(afterAddProject);
      const afterAddNotes = afterAddDiagram?.notes ?? [];
      const newNote = afterAddNotes.find(
        (note) => !beforeNotes.some((prev) => prev.id === note.id)
      );
      if (!newNote || newNote.picking !== 'D') {
        findings.push({
          id: 'picking-add-note',
          detail: 'Adding a note in Picking mode did not create a note with picking="D".'
        });
      } else {
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
        await sleep(1200);
        const afterToggleProject = await getProject(page);
        const afterToggleDiagram = getSelectedDiagram(afterToggleProject);
        const toggled = afterToggleDiagram?.notes?.find(
          (note) => note.stringIndex === newNote.stringIndex && note.fret === newNote.fret
        );
        if (!toggled || toggled.picking !== 'U') {
          findings.push({
            id: 'picking-toggle-note',
            detail: 'Second click in Picking mode did not toggle picking to "U".'
          });
        }
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
        await sleep(1200);
        const afterRemoveProject = await getProject(page);
        const afterRemoveDiagram = getSelectedDiagram(afterRemoveProject);
        const stillThere = afterRemoveDiagram?.notes?.some(
          (note) => note.stringIndex === newNote.stringIndex && note.fret === newNote.fret
        );
        if (stillThere) {
          findings.push({
            id: 'picking-remove-note',
            detail: 'Third click in Picking mode did not remove the note.'
          });
        }
      }
    }
  }

  // Add a manual note and then Replace Diagram; check whether manual notes persist.
  await ensureSelected();
  const svg = page.locator('svg.neck-diagram-svg').first();
  const box = await svg.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
    await sleep(1000);
  }

  const afterManualProject = await getProject(page);
  const afterManualDiagram = afterManualProject?.data?.diagrams?.[0];
  const manualNotes = afterManualDiagram ? afterManualDiagram.notes.length : 0;
  if (baseNotes && manualNotes === baseNotesCount) {
    findings.push({
      id: 'manual-note-add-failed',
      detail: 'Clicking on the diagram did not change the notes; note count stayed the same.'
    });
  }

  await theoryPanel.getByRole('button', { name: /Replace Diagram|Create Diagram/ }).click();
  await sleep(1200);

  const afterManualReplaceProject = await getProject(page);
  const afterManualReplaceDiagram = afterManualReplaceProject?.data?.diagrams?.[0];
  const manualNotesAfterReplace = afterManualReplaceDiagram ? afterManualReplaceDiagram.notes.length : 0;

  if (manualNotes > baseNotesCount && manualNotesAfterReplace < manualNotes) {
    findings.push({
      id: 'replace-clears-notes',
      detail: 'Replace Diagram cleared manual notes (note count dropped after replace).'
    });
  }

  await browser.close();

  console.log(JSON.stringify({ findings }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
